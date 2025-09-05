const API_BASE = 'https://script.googleapis.com/v1';

// Optional guard (Owner-Proxy mode). Set TOKEN and ALLOW to enable.
const CONFIG = { ENABLE_GUARD: false, TOKEN: 'CHANGE_ME', ALLOW: [] };

function getBearer_() {
  return 'Bearer ' + ScriptApp.getOAuthToken();
}

function fetchJson_(url, opt) {
  const res = UrlFetchApp.fetch(url, {
    method: opt.method || 'get',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: opt.body ? JSON.stringify(opt.body) : undefined,
    headers: Object.assign({ Authorization: getBearer_() }, opt.headers || {})
  });
  const text = res.getContentText();
  const code = res.getResponseCode();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { raw: text }; }
  if (code >= 200 && code < 300) return json;
  throw new Error('HTTP ' + code + ': ' + text);
}

const api = {
  getContent: function (scriptId) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/content';
    return fetchJson_(url, { method: 'get' });
  },
  updateContent: function (scriptId, files) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/content';
    return fetchJson_(url, { method: 'put', body: { files: files } });
  },
  createVersion: function (scriptId, description) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/versions';
    return fetchJson_(url, { method: 'post', body: { description: description || '' } });
  },
  listVersions: function (scriptId) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/versions';
    return fetchJson_(url, { method: 'get' });
  },
  createDeployment: function (scriptId, versionNumber, description) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/deployments';
    return fetchJson_(url, { method: 'post', body: { versionNumber: versionNumber, manifestFileName: 'appsscript', description: description || ('Deploy v' + versionNumber) } });
  },
  listDeployments: function (scriptId) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/deployments';
    return fetchJson_(url, { method: 'get' });
  },
  updateDeployment: function (scriptId, deploymentId, versionNumber, description) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/deployments/' + encodeURIComponent(deploymentId);
    return fetchJson_(url, { method: 'patch', body: { deploymentConfig: { scriptId: scriptId, manifestFileName: 'appsscript', versionNumber: versionNumber, description: description || ('Update to v' + versionNumber) } } });
  },
  undeploy: function (scriptId, deploymentId) {
    const url = API_BASE + '/projects/' + encodeURIComponent(scriptId) + '/deployments/' + encodeURIComponent(deploymentId);
    return fetchJson_(url, { method: 'delete' });
  },
  run: function (scriptId, functionName, parameters, devMode) {
    const url = API_BASE + '/scripts/' + encodeURIComponent(scriptId) + ':run';
    return fetchJson_(url, { method: 'post', body: { function: functionName, parameters: parameters || [], devMode: devMode === true } });
  }
};

function normalizeRunResult_(raw) {
  if (raw && raw.response) {
    return { ok: true, data: { result: (raw.response.result === undefined ? null : raw.response.result) }, error: null, logs: raw.log || [], meta: { executionId: raw.executionId || null } };
  }
  if (raw && raw.error && raw.error.details && raw.error.details.length) {
    var d = raw.error.details[0] || {};
    return { ok: false, data: null, error: { message: d.errorMessage || 'Script error', type: d.errorType || 'ERROR', stack: (d.scriptStackTraceElements || []).map(function (s) { return { func: s.function || null, line: s.lineNumber || null }; }) }, logs: raw.log || [], meta: { executionId: raw.executionId || null } };
  }
  return { ok: false, data: null, error: { message: 'Unknown run response' }, logs: [], meta: {} };
}

var DEFAULT_ADMIN_SHIM_SOURCE = (
  '/** Admin shim inside target GAS project */\n' +
  'function admin_listTriggers() {\n' +
  '  return ScriptApp.getProjectTriggers().map(function(t){\n' +
  '    return {\n' +
  '      id: t.getUniqueId ? t.getUniqueId() : null,\n' +
  '      handlerFunction: t.getHandlerFunction(),\n' +
  '      type: String(t.getEventType && t.getEventType())\n' +
  '    };\n' +
  '  });\n' +
  '}\n' +
  'function admin_createTimeTrigger(handlerFunction, everyMinutes) {\n' +
  '  var b = ScriptApp.newTrigger(handlerFunction).timeBased();\n' +
  '  if (everyMinutes && everyMinutes >= 1 && everyMinutes <= 60) { b = b.everyMinutes(everyMinutes); } else { b = b.everyHours(1); }\n' +
  '  var trig = b.create();\n' +
  '  return { handlerFunction: handlerFunction, id: trig.getUniqueId ? trig.getUniqueId() : null };\n' +
  '}\n' +
  'function admin_deleteTriggerByFunction(handlerFunction) {\n' +
  '  var count = 0;\n' +
  '  ScriptApp.getProjectTriggers().forEach(function(t){ if (t.getHandlerFunction() === handlerFunction) { ScriptApp.deleteTrigger(t); count++; } });\n' +
  '  return { deleted: count };\n' +
  '}\n' +
  'function admin_listProperties(store) { var p = pickStore_(store); return p.getProperties(); }\n' +
  'function admin_setProperties(store, obj) { var p = pickStore_(store); p.setProperties(obj, true); return { ok: true }; }\n' +
  'function admin_deleteProperty(store, key) { var p = pickStore_(store); p.deleteProperty(key); return { ok: true }; }\n' +
  'function pickStore_(store) {\n' +
  "  switch ((store || 'script').toLowerCase()) { case 'user': return PropertiesService.getUserProperties(); case 'document': return PropertiesService.getDocumentProperties(); default: return PropertiesService.getScriptProperties(); }\n" +
  '}\n'
);

function ensureAdminShim_(scriptId) {
  var cur = api.getContent(scriptId);
  var files = cur.files || [];
  var idx = -1;
  for (var i = 0; i < files.length; i++) {
    if (files[i].name === 'AdminShim' && files[i].type === 'SERVER_JS') { idx = i; break; }
  }
  if (idx >= 0) {
    if (files[idx].source && files[idx].source !== DEFAULT_ADMIN_SHIM_SOURCE) {
      throw new Error('ERR_ADMIN_SHIM_CONFLICT: AdminShim already exists with different content');
    }
    return { ok: true, data: { injected: false }, error: null };
  }
  var newFiles = files.concat([{ name: 'AdminShim', type: 'SERVER_JS', source: DEFAULT_ADMIN_SHIM_SOURCE }]);
  api.updateContent(scriptId, newFiles);
  return { ok: true, data: { injected: true }, error: null };
}

function required_(obj, key) {
  if (!obj || obj[key] === undefined || obj[key] === null) throw new Error('Missing required param: ' + key);
  return obj[key];
}

function handle_(method, params) {
  switch (method) {
    case 'ping':
      return { ok: true, data: { pong: true, user: (Session.getActiveUser().getEmail() || null) }, error: null };
    case 'getContent':
      return { ok: true, data: api.getContent(required_(params, 'scriptId')), error: null };
    case 'updateContent':
      return { ok: true, data: api.updateContent(required_(params, 'scriptId'), required_(params, 'files')), error: null };
    case 'createVersion':
      return { ok: true, data: api.createVersion(required_(params, 'scriptId'), params.description), error: null };
    case 'listVersions':
      return { ok: true, data: api.listVersions(required_(params, 'scriptId')), error: null };
    case 'createDeployment':
      return { ok: true, data: api.createDeployment(required_(params, 'scriptId'), required_(params, 'versionNumber'), params.description), error: null };
    case 'listDeployments':
      return { ok: true, data: api.listDeployments(required_(params, 'scriptId')), error: null };
    case 'updateDeployment':
      return { ok: true, data: api.updateDeployment(required_(params, 'scriptId'), required_(params, 'deploymentId'), required_(params, 'versionNumber'), params.description), error: null };
    case 'undeploy':
      return { ok: true, data: api.undeploy(required_(params, 'scriptId'), required_(params, 'deploymentId')), error: null };
    case 'run':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), required_(params, 'functionName'), (params.parameters || []), params.devMode === true));
    case 'listTriggers':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), 'admin_listTriggers', [], true));
    case 'createTimeTrigger':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), 'admin_createTimeTrigger', [required_(params, 'handlerFunction'), (params.everyMinutes || 60)], true));
    case 'deleteTriggerByFunction':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), 'admin_deleteTriggerByFunction', [required_(params, 'handlerFunction')], true));
    case 'listProperties':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), 'admin_listProperties', [params.store || 'script'], true));
    case 'setProperties':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), 'admin_setProperties', [params.store || 'script', required_(params, 'props')], true));
    case 'deleteProperty':
      return normalizeRunResult_(api.run(required_(params, 'scriptId'), 'admin_deleteProperty', [params.store || 'script', required_(params, 'key')], true));
    case 'ensureAdminShim':
      return ensureAdminShim_(required_(params, 'scriptId'));
    default:
      throw new Error('Unknown method: ' + method);
  }
}

function readAdminToken_(e, body) {
  try {
    if (body && body.adminToken) return body.adminToken;
  } catch (err) {}
  try {
    if (e && e.parameter && e.parameter['X-Admin-Token']) return e.parameter['X-Admin-Token'];
  } catch (err2) {}
  return null;
}

function checkGuard_(e, body) {
  if (!CONFIG.ENABLE_GUARD) return; // disabled by default
  var token = readAdminToken_(e, body);
  var scriptId = body && body.params ? body.params.scriptId : null;
  if (!token || token !== CONFIG.TOKEN) throw new Error('ERR_NOT_ALLOWED: bad token');
  if (!scriptId || CONFIG.ALLOW.indexOf(scriptId) < 0) throw new Error('ERR_NOT_ALLOWED: not in allowlist');
}

function doPost(e) {
  try {
    var body = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    checkGuard_(e, body);
    var result = handle_(body.method, body.params || {});
    // If result already unified, return as-is
    if (result && typeof result.ok === 'boolean') return jsonOut_(result, 200);
    return jsonOut_({ ok: true, data: result, error: null }, 200);
  } catch (err) {
    return jsonOut_({ ok: false, data: null, error: String(err) }, 400);
  }
}

function doGet() {
  return jsonOut_({ ok: true, data: { ping: true }, error: null }, 200);
}

function jsonOut_(obj, code) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

