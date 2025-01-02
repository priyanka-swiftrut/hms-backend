const notification = (io) => {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join society room
        socket.on('join-society', (societyId) => {
            socket.join(`society-${societyId}`);
            console.log(`Client joined society room: society-${societyId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};

export default notification;