require('dotenv').config();
const { SentinelClient } = require("defender-sentinel-client")


const Sentinel_API_KEY = process.env.DEFENDER_KEY
const Sentinel_API_SECRET = process.env.DEFENDER_SECRET

const client = new SentinelClient({
    apiKey: Sentinel_API_KEY,
    apiSecret: Sentinel_API_SECRET
});

console.log(Sentinel_API_KEY)

// const notification = await client.createNotificationChannel('webhook', {
//     name: 'mywebhook',
//     config: {
//         url: 'https://www.larksuite.com/flow/api/trigger-webhook/ec16662f820bba83b929e4f6e672e3f6',
//     },
//     paused: false,
// });

client.list().then((list) => {
    console.log(list.items[0].notifyConfig);
})

client.getNotificationChannel({ type: 'webhook', notificationId: 'f9eaf038-7b1c-4ed7-9142-72b1bcd7980c' }).then((res) => {
    console.log(res)
})

async function list() {
    const list = await client.list();
    console.log(list);
}

module.exports = {
    list
}