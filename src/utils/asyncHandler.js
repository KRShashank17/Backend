        // using Pormises
const asyncHandler = (fn)=> {
    (req,res,next) => {
        Promise.resolve(fn(req,res,next))
            .catch((err) => next(err))
    }
}

        // Try Catch
// const asyncHandler = (fn) => async (req, res, next) => { 
//     try {
//         await fn(req,res,next);
//     } catch (err) {
//         res.status(err.status || 500).json({
//             success : false,
//             message : err.message || "Internal Server Error"
//         })
//     }
// } 

export {asyncHandler}