/** Admin shim inside target GAS project */

function admin_listTriggers() {
  return ScriptApp.getProjectTriggers().map(function (t) {
    return {
      id: t.getUniqueId ? t.getUniqueId() : null,
      handlerFunction: t.getHandlerFunction(),
      type: String(t.getEventType && t.getEventType())
    };
  });
}

function admin_createTimeTrigger(handlerFunction, everyMinutes) {
  var b = ScriptApp.newTrigger(handlerFunction).timeBased();
  if (everyMinutes && everyMinutes >= 1 && everyMinutes <= 60) {
    b = b.everyMinutes(everyMinutes);
  } else {
    b = b.everyHours(1);
  }
  var trig = b.create();
  return { handlerFunction: handlerFunction, id: trig.getUniqueId ? trig.getUniqueId() : null };
}

function admin_deleteTriggerByFunction(handlerFunction) {
  var count = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === handlerFunction) {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });
  return { deleted: count };
}

function admin_listProperties(store) {
  var p = pickStore_(store);
  return p.getProperties();
}

function admin_setProperties(store, obj) {
  var p = pickStore_(store);
  p.setProperties(obj, true);
  return { ok: true };
}

function admin_deleteProperty(store, key) {
  var p = pickStore_(store);
  p.deleteProperty(key);
  return { ok: true };
}

function pickStore_(store) {
  switch ((store || 'script').toLowerCase()) {
    case 'user': return PropertiesService.getUserProperties();
    case 'document': return PropertiesService.getDocumentProperties();
    default: return PropertiesService.getScriptProperties();
  }
}

