const asyncHandler=(requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((error)=>next(error))
    }
}



export {asyncHandler};


// const asyncHandler=(func)=>async(req,res,next)=>{
//     try {
//         await func(req,res,next);
//     } catch (error) {
//         res.status(500 || error.code).json({
//             success:false,
//             message:error.message
//         })
//     }
// }