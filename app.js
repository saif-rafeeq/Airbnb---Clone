const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const listingRouter = require('./routes/listing.js');
const reviewRouter = require("./routes/review.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const userRouter = require("./routes/user.js");
const firstRouter = require("./routes/first.js");
const mongoose = require('mongoose')
 require("dotenv").config();
 const bodyParser = require( "body-parser")

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const dburl = process.env.ATLASDB_URL

main().then(() => {
  console.log("connected to DB ");
}).catch(err => {
  console.log(err);
});

//Creating a database 
async function main () {
  await mongoose.connect(dburl), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
}

const store = MongoStore.create({
  mongoUrl:dburl,
  crypto: {
      secret : process.env.SECRET,
  },
  touchAfter : 24 *3600,
});
store.on("error",() => {
  console.log("ERROR in mongo session store",err);
});



const sessionOptions = {
  store,
  secret : process.env.SECRET,
  resave : false,
  saveUninitialized : true,
  cookie : {
      expires : Date.now() + 7*24*60 *60*1000,
      maxAge :  7*24*60 *60*1000,
      httpOnly : true,
  }, 
  
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session()); 
passport.use(new LocalStrategy(User.authenticate()));
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user; 
    next();
});

  app.use("/",firstRouter);
//Restructuirng listings 
app.use("/listings",listingRouter); 
//Restructuring reviews
app.use("/listings/:id/reviews" ,reviewRouter);
app.use("/",userRouter);

app.all("*", (req ,res , next) => {
    next(new ExpressError(404, "Page not found!"));
});

app.use((err, req,res,next) => {
    let {statusCode = 500 , message ="Something went wrong"}= err;
    res.status(statusCode).render("error.ejs",{message});
    // res.status(statusCode).send(message);
});


// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};

//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });

module.exports = app;
