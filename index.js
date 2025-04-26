import express from 'express';
import { config } from 'dotenv';
import { agent } from './agent.js';
import cors from 'cors';

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.post('/ask', async (req, res) => {
    const { message } = req.body;
    const response = await agent.invoke({
        messages: [
            {
                role: 'user',
                content: message,
            },
        ],
    });
    res.json({ reply: response });
})