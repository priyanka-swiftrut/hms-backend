const deleteImage = async (path, folder) => {
    if (path) {
        const publicId = path.split("/").pop().split(".")[0];
        if (folder) {
            await cloudinary.uploader.destroy(`${folder}/${publicId}`);
        }
    }
}

export default deleteImage;