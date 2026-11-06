// Load env vars — absolute path, CWD pe depend nahi karega
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`✅ NovaStore server running on port ${PORT}`);
            console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
        });

        const shutdown = (signal) => {
            console.log(`\n${signal} received. Closing server...`);
            server.close(() => {
                console.log('Server closed. Bye.');
                process.exit(0);
            });
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (error) {
        console.error('❌ Server startup failed:', error.message);
        process.exit(1);
    }
};

startServer();
