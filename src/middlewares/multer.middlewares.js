import multer from "multer"


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/temp/my-uploads')
    },
    filename: function (req, file, cb) {
        //home work : find how this change in file name happen
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
    }
  })
  
 export const upload = multer({ storage })

 //in this first we want it to save on our server than we want to save it in a cloudinary