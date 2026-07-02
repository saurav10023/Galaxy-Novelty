import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors" ;

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use( (express.json( {limit:"16kb"} )))
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())  // use cookie in ueer controller   or anywhere


// routes 
import adminRouter from "./routes/admin.routes.js";
app.use("/api/v1/admin" , adminRouter);
import productRouter from "./routes/product.routes.js";
app.use("/api/v1/products" ,productRouter)


app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || []
  });
});



export {app}