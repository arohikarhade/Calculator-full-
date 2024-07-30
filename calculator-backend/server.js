const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const { evaluate } = require('mathjs');
const logger = require('./logger/index.js');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());
app.use(cors());

const MONGODB_URI = 'mongodb://127.0.0.1:27017/calculator'; // Update this if using MongoDB Atlas

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.log(err));

const operationSchema = new mongoose.Schema({
  expression: String,
  result: String,
  valid: Boolean,
  timestamp: { type: Date, default: Date.now }
});

const Operation = mongoose.model('Operation', operationSchema);

app.post('/api/operations', async (req, res) => {
  const { expression } = req.body;
  let result;
  let valid;

  try {
    result = evaluate(expression).toString();
    valid = true; 
  } 
  catch (error) {
    result = 'Error';
    valid = false;
  }

  try{
    const newOperation = new Operation({ expression, result, valid });
    await newOperation.save();
    res.status(201).send(newOperation);

    io.emit('logs', await Operation.find());

    // Log to file
    if (logger) {
        logger.info(newOperation);
    }
  }
  catch(error){
    const newOperation = new Operation({ expression, result, valid });
    await newOperation.save();
    logger.info(newOperation);
    res.status(400).send(newOperation);
  }
});

app.get('/api/operations', async (req, res) => {
  try {
    const operations = await Operation.find();
    res.status(200).send(operations);
  } 
  catch (error) {
    res.status(400).send(error);
  }
});

app.get('/api/logs', async (req, res) => {
  const logFilePath = path.join(__dirname, 'combined.log');

  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return res.status(500).send('Error reading log file');
    }

    try {
        const logEntries = data.split('\n').filter(line => line).map(line => JSON.parse(line));
        res.status(200).json(logEntries);
    } 
    catch (error) {
        console.error('Error parsing log file:', error);
        res.status(500).send('Error parsing log file');
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
