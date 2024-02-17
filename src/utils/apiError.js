class ApiError extends Error {
    constructor ( statusCode , message="Some Error", errors=[] , stack="") {
        super(message);
        this.data = null ,
        this.status = statusCode;
        this.message = message;
        this.errors = errors;
        this.success = false;
        
        if (stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export {ApiError}