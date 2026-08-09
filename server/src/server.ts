import 'dotenv/config';
import app from './app';
import prisma from './lib/prisma';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Verify database connectivity on startup
    await prisma.$connect();
    console.log('✅ Database connection established');

    app.listen(PORT, () => {
      console.log(`🚀 FundsRoom Mini ERP Server running on port ${PORT}`);
      console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
