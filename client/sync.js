setClock(makeClock(new Timestamp(0, 0, makeClientId())));

let _onSync = null;
let _syncEnabled = true;

function setSyncingEnabled(flag) {
  _syncEnabled = flag;
}

async function post(data) {
  let res = await fetch('https://crdt.jlongster.com/server/sync', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  res = await res.json();

  if (res.status !== 'ok') {
    throw new Error('API error: ' + res.reason);
  }
  return res.data;
}

function apply(msg) {
  let table = _data[msg.dataset];
  if (!table) {
    throw new Error('Unknown dataset: ' + msg.dataset);
  }

  let row = table.find(row => row.id === msg.row);
  if (!row) {
    table.push({ id: msg.row, [msg.column]: msg.value });
  } else {
    row[msg.column] = msg.value;
  }
}

function compareMessages(messages) {
  let existingMessages = new Map();

  // This could be optimized, but keeping it simple for now. Need to
  // find the latest message that exists for the dataset/row/column
  // for each incoming message, so sort it first

  let sortedMessages = [..._messages].sort((m1, m2) => {
    if (m1.timestamp < m2.timestamp) {
      return 1;
    } else if (m1.timestamp > m2.timestamp) {
      return -1;
    }
    return 0;
  });

  messages.forEach(msg1 => {
    let existingMsg = sortedMessages.find(
      msg2 =>
        msg1.dataset === msg2.dataset &&
        msg1.row === msg2.row &&
        msg1.column === msg2.column
    );

    existingMessages.set(msg1, existingMsg);
  });

  return existingMessages;
}

function applyMessages(messages) {
  let existingMessages = compareMessages(messages);
  let clock = getClock();

  messages.forEach(msg => {
    let existingMsg = existingMessages.get(msg);

    if (!existingMsg || existingMsg.timestamp < msg.timestamp) {
      apply(msg);
    }

    if (!existingMsg || existingMsg.timestamp !== msg.timestamp) {
      clock.merkle = merkle.insert(
        clock.merkle,
        Timestamp.parse(msg.timestamp)
      );
      _messages.push(msg);
    }
  });

  _onSync && _onSync();
}

function sendMessages(messages) {
  applyMessages(messages);
  sync(messages);
}

function receiveMessages(messages) {
  messages.forEach(msg =>
    Timestamp.recv(getClock(), Timestamp.parse(msg.timestamp))
  );

  applyMessages(messages);
}

function onSync(func) {
  _onSync = func;
}

async function sync(initialMessages = [], since = null) {
  if (!_syncEnabled) {
    return;
  }

  let messages = initialMessages;

  if (since) {
    let timestamp = new Timestamp(since, 0, '0').toString();
    messages = _messages.filter(msg => msg.timestamp >= timestamp);
  }

  let result = await post({
    group_id: 'my-group',
    client_id: getClock().timestamp.node(),
    messages,
    merkle: getClock().merkle
  });

  receiveMessages(result.messages);

  let diffTime = merkle.diff(result.merkle, getClock().merkle);

  if (diffTime) {
    if (since && since === diffTime) {
      throw new Error(
        'A bug happened while syncing and the client ' +
          'was unable to get in sync with the server. ' +
          "This is an internal error that shouldn't happen"
      );
    }

    return sync([], diffTime);
  }
}
