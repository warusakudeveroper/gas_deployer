#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const CONFIG_DIR = path.join(os.homedir(), '.gas-admin');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { active: null, profiles: {} };
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}
function saveConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

async function promptSetup(existingName=null) {
  const rl = readline.createInterface({ input, output });
  console.log('\n=== GAS Admin CLI Setup ===');
  const profileName = existingName || await rl.question(`Profile name [default]: `) || 'default';
  const endpoint = await rl.question(`Web App endpoint (…/exec): `);
  if (!endpoint) { console.error('Endpoint is required.'); process.exit(1); }
  const mode = (await rl.question(`Mode: [1] User-Session  [2] Owner-Proxy (token) [1/2]: `) || '2').trim();
  let adminToken = '';
  if (mode === '2') {
    adminToken = await rl.question(`X-Admin-Token (server-side): `);
    if (!adminToken) { console.error('Admin token required for Owner-Proxy mode.'); process.exit(1); }
  }
  const defaultScriptId = await rl.question(`(Optional) Default scriptId: `);
  rl.close();

  const cfg = loadConfig();
  cfg.profiles[profileName] = {
    endpoint,
    mode: mode === '2' ? 'owner-proxy' : 'user-session',
    adminToken: mode === '2' ? adminToken : null,
    defaultScriptId: defaultScriptId || null
  };
  cfg.active = profileName;
  saveConfig(cfg);
  console.log(`\nSaved profile "${profileName}" and set as active.\n`);
}

function getActiveProfileOrExit() {
  const cfg = loadConfig();
  if (!cfg.active || !cfg.profiles[cfg.active]) {
    console.error('No active profile. Run: gas-admin setup');
    process.exit(1);
  }
  return { cfg, prof: cfg.profiles[cfg.active] };
}

function httpJson(urlStr, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const isHttps = u.protocol === 'https:';
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    };
    const lib = isHttps ? https : http;
    const req = lib.request(u, opts, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        const code = res.statusCode || 0;
        let json;
        try { json = buf ? JSON.parse(buf) : {}; } catch(e) { json = { raw: buf }; }
        if (code >= 200 && code < 300) resolve(json);
        else reject(new Error(`HTTP ${code}: ${buf}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function callProxy(method, params) {
  const { prof } = getActiveProfileOrExit();
  const headers = {};
  const payload = { method, params: params || {} };
  if (prof.mode === 'owner-proxy' && prof.adminToken) {
    payload.adminToken = prof.adminToken; // server reads from body
    headers['X-Admin-Token'] = prof.adminToken; // optional
  }
  return httpJson(prof.endpoint, 'POST', payload, headers);
}

function usage() {
  console.log(`\nGAS Admin CLI\n\nCommands:\n  setup                         Setup or add profile\n  profile:list                  List profiles\n  profile:use <name>            Switch active profile\n  whoami                        Ping server\n  get <scriptId?>               Get project content\n  update <scriptId?> <file>     Update content (PUT files.json)\n  run <scriptId?> <func> [args JSON]   Run function (devMode:true)\n  version <scriptId?> <desc>    Create version\n  versions:list <scriptId?>     List versions\n  deploy <scriptId?> <version> [desc]  Create deployment\n  depl:list <scriptId?>         List deployments\n  depl:update <scriptId?> <deploymentId> <version> [desc]\n  shim:ensure <scriptId?>       Ensure AdminShim injected\n  trig:list <scriptId?>         List triggers (AdminShim)\n  trig:add <scriptId?> <handler> [everyMin=5]\n  trig:del <scriptId?> <handler>\n  prop:list <scriptId?> [store=script]\n  prop:set  <scriptId?> <store> <jsonProps>\n  prop:del  <scriptId?> <store> <key>\n`);
}

function resolveScriptId(arg) {
  const { prof } = getActiveProfileOrExit();
  return arg || prof.defaultScriptId || (() => { console.error('scriptId required (or set default in profile).'); process.exit(1); })();
}

async function main() {
  const [,, cmd, ...rest] = process.argv;
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { usage(); return; }

  if (cmd === 'setup') { await promptSetup(); return; }
  if (cmd === 'profile:list') {
    const cfg = loadConfig();
    console.log('Profiles:');
    Object.keys(cfg.profiles).forEach(name => {
      const mark = (cfg.active === name) ? '*' : ' ';
      console.log(` ${mark} ${name} -> ${cfg.profiles[name].mode} @ ${cfg.profiles[name].endpoint}`);
    });
    return;
  }
  if (cmd === 'profile:use') {
    const name = rest[0];
    const cfg = loadConfig();
    if (!name || !cfg.profiles[name]) { console.error('Profile not found.'); process.exit(1); }
    cfg.active = name;
    saveConfig(cfg);
    console.log(`Switched to profile "${name}".`);
    return;
  }

  try {
    switch (cmd) {
      case 'whoami': {
        const res = await callProxy('ping', {});
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'get': {
        const scriptId = resolveScriptId(rest[0]);
        const res = await callProxy('getContent', { scriptId });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'update': {
        const scriptId = resolveScriptId(rest[0]);
        const file = rest[1];
        if (!file) { console.error('files.json path required'); process.exit(1); }
        const files = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const res = await callProxy('updateContent', { scriptId, files });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'run': {
        const scriptId = resolveScriptId(rest[0]);
        const func = rest[1];
        const args = rest[2] ? JSON.parse(rest[2]) : [];
        const res = await callProxy('run', { scriptId, functionName: func, parameters: args, devMode: true });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'version': {
        const scriptId = resolveScriptId(rest[0]);
        const desc = rest.slice(1).join(' ') || '';
        const res = await callProxy('createVersion', { scriptId, description: desc });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'versions:list': {
        const scriptId = resolveScriptId(rest[0]);
        const res = await callProxy('listVersions', { scriptId });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'deploy': {
        const scriptId = resolveScriptId(rest[0]);
        const versionNumber = parseInt(rest[1], 10);
        const desc = rest.slice(2).join(' ') || '';
        if (!versionNumber) { console.error('versionNumber required'); process.exit(1); }
        const res = await callProxy('createDeployment', { scriptId, versionNumber, description: desc });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'depl:list': {
        const scriptId = resolveScriptId(rest[0]);
        const res = await callProxy('listDeployments', { scriptId });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'depl:update': {
        const scriptId = resolveScriptId(rest[0]);
        const deploymentId = rest[1];
        const versionNumber = parseInt(rest[2], 10);
        const desc = rest.slice(3).join(' ') || '';
        if (!deploymentId || !versionNumber) { console.error('deploymentId and versionNumber required'); process.exit(1); }
        const res = await callProxy('updateDeployment', { scriptId, deploymentId, versionNumber, description: desc });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'shim:ensure': {
        const scriptId = resolveScriptId(rest[0]);
        const res = await callProxy('ensureAdminShim', { scriptId });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'trig:list': {
        const scriptId = resolveScriptId(rest[0]);
        const res = await callProxy('listTriggers', { scriptId });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'trig:add': {
        const scriptId = resolveScriptId(rest[0]);
        const handler = rest[1];
        const every = parseInt(rest[2] || '5', 10);
        const res = await callProxy('createTimeTrigger', { scriptId, handlerFunction: handler, everyMinutes: every });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'trig:del': {
        const scriptId = resolveScriptId(rest[0]);
        const handler = rest[1];
        const res = await callProxy('deleteTriggerByFunction', { scriptId, handlerFunction: handler });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'prop:list': {
        const scriptId = resolveScriptId(rest[0]);
        const store = rest[1] || 'script';
        const res = await callProxy('listProperties', { scriptId, store });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'prop:set': {
        const scriptId = resolveScriptId(rest[0]);
        const store = rest[1];
        const props = JSON.parse(rest[2] || '{}');
        const res = await callProxy('setProperties', { scriptId, store, props });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      case 'prop:del': {
        const scriptId = resolveScriptId(rest[0]);
        const store = rest[1];
        const key = rest[2];
        const res = await callProxy('deleteProperty', { scriptId, store, key });
        console.log(JSON.stringify(res, null, 2));
        break;
      }
      default:
        usage();
    }
  } catch (e) {
    console.error(String(e));
    process.exit(1);
  }
}

main();

