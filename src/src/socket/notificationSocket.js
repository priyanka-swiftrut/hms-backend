const notification = (io) => {
    io.on('connection', (socket) => {
        // Join society room
        socket.on('join-hospital', (hospitalId) => {
            socket.join(`hospital-${hospitalId}`);
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

    

export default notification; 