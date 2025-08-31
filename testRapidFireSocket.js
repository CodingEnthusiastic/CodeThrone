const io = require('socket.io-client');

console.log('🚀 Testing Rapid Fire Socket Connection...');

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to server with socket ID:', socket.id);
  
  // Simulate joining a rapid fire game
  console.log('📍 Joining rapid fire game...');
  socket.emit('join-rapidfire-game', {
    userId: '676b31c780e9f59c2ba1462a9',
    username: 'testuser'
  });
});

socket.on('rapidfire-game-state', (data) => {
  console.log('🎮 Received game state:', {
    gameId: data.gameId,
    status: data.status,
    players: data.players,
    questionSetLength: data.questionSet?.length,
    firstQuestionType: typeof data.questionSet?.[0],
    firstQuestionId: data.questionSet?.[0]?._id || data.questionSet?.[0],
    firstQuestionText: data.questionSet?.[0]?.questionText || 'NOT POPULATED',
    firstQuestionOptions: data.questionSet?.[0]?.options?.length || 0
  });
});

socket.on('rapidfire-game-started', (data) => {
  console.log('🎯 Game started event received:', {
    gameId: data.gameId,
    status: data.status,
    questionSetLength: data.questionSet?.length,
    firstQuestionType: typeof data.questionSet?.[0],
    firstQuestionText: data.questionSet?.[0]?.questionText || 'NOT POPULATED',
    firstQuestionOptions: data.questionSet?.[0]?.options?.length || 0
  });
  
  // Disconnect after testing
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - disconnecting');
  socket.disconnect();
  process.exit(1);
}, 10000);
