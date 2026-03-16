import express from 'express'
import morgan from 'morgan'
import { connectTelegram } from './config/telegram.js'
import photoRoutes from './routes/photoRoutes.js'
import filesRoutes from './routes/filesRoutes.js'

const app = express()

// called telegram to connect 
connectTelegram()


// middleware 
app.use(express.json())

// morgan setup config Custom format: method, URL, status, response time
morgan.token('time', (req, res) => {
  return `${res.responseTime} ms`;
});

// Middleware to measure response time
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    res.responseTime = (diff[0] * 1e3 + diff[1] / 1e6).toFixed(2);
  });
  next();
});

// Morgan logger only for GET and POST
app.use(
  morgan(':method :url :status :time', {
    skip: (req) => !['GET', 'POST'].includes(req.method),
  })
);



// Routes config

app.use('/api/photo',photoRoutes)
app.use('/api/files',filesRoutes)

app.get('/health',(req,res) => {
    res.send('all good')
})

export default app