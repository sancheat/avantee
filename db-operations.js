require('dotenv').config();

const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('avantee'); // Your DB name
    console.log('✅ Connected to MongoDB Atlas');
  }
  return db;
}

async function trackStorySession({ sessionId, playerName, startedAt }) {
  const db = await connectDB();
  await db.collection('sessions').insertOne({
    sessionId,
    playerName,
    startedAt: startedAt || new Date(),
    choices: []
  });
  return { sessionId };
}

async function recordChoice({ sessionId, sceneId, choiceText, nextSceneId, choiceOrder }) {
  const db = await connectDB();
  await db.collection('sessions').updateOne(
    { sessionId },
    {
      $push: {
        choices: {
          sceneId,
          choiceText,
          nextSceneId,
          choiceOrder,
          chosenAt: new Date()
        }
      }
    }
  );
}

async function saveRewardDownload({ sessionId, rewardId, rewardTitle }) {
  const db = await connectDB();
  await db.collection('rewards').insertOne({
    sessionId,
    rewardId,
    rewardTitle,
    downloadedAt: new Date()
  });
}

async function getSessionStats(sessionId) {
  const db = await connectDB();
  const session = await db.collection('sessions').findOne({ sessionId });
  return session ? { session, totalChoices: session.choices.length } : null;
}

module.exports = {
  trackStorySession,
  recordChoice,
  saveRewardDownload,
  getSessionStats
};
