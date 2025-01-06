const notification = (io) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join society room
        socket.on('join-hospital', (hospitalId) => {
            socket.join(`hospital-${hospitalId}`);
            console.log(`Client joined hospital room: hospital-${hospitalId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

    

export default notification; 