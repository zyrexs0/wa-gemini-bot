const fs = require("fs");

const FILE = "./data/chats.json";

if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
}

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, "{}");
}

function loadMemory() {
    return JSON.parse(fs.readFileSync(FILE));
}

function saveMemory(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function addChat(user, role, text) {
    const db = loadMemory();

    if (!db[user]) db[user] = [];

    db[user].push({
        role,
        text
    });

    if (db[user].length > 20) {
        db[user] = db[user].slice(-20);
    }

    saveMemory(db);
}

function getChat(user) {
    const db = loadMemory();
    return db[user] || [];
}

module.exports = {
    addChat,
    getChat
};
