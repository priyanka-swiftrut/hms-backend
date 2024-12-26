import dotenv from 'dotenv';
import Passport from 'passport';
import UserModel from '../models/User.model.js';
import { Strategy as jwtStrategy, ExtractJwt } from 'passport-jwt';

dotenv.config();

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_ADMIN,
};

const doctorOpts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_DOCTOR,
}

const patientOpts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_PATIENT,
}

const receptionistOpts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET_RECEPTIONIST,
}

Passport.use(new jwtStrategy(opts, async (record, done) => {
    try {
        let data = await UserModel.findById(record.userData._id);
        if (data && data.role === 'admin') {
            return done(null, data);
        } else {
            return done(null, false, { message: 'Unauthorized access' });
        }
    } catch (error) {
        return done(error, false);
    }
}));

Passport.use("Doctor", new jwtStrategy(doctorOpts, async (record, done) => {
    try {
        let data = await UserModel.findById(record.userData._id);
        if (data && data.role === 'doctor') {
            return done(null, data);
        } else {
            return done(null, false, { message: 'Unauthorized access' });
        }
    } catch (error) {
        return done(error, false);
    }
}));

Passport.use("Patient", new jwtStrategy(patientOpts, async (record, done) => {
    try {
        let data = await UserModel.findById(record.userData._id);
        if (data && data.role === 'patient') {
            return done(null, data);
        } else {
            return done(null, false, { message: 'Unauthorized access' });
        }
    } catch (error) {
        return done(error, false);
    }
}));          

Passport.use("Receptionist", new jwtStrategy(receptionistOpts, async (record, done) => {
    try {
        let data = await UserModel.findById(record.userData._id);
        if (data && data.role === 'receptionist') {
            return done(null, data);
        } else {
            return done(null, false, { message: 'Unauthorized access' });
        }
    } catch (error) { 
        return done(error, false);
    }
}));

Passport.serializeUser((user, done) => {
    return done(null, user.id);
});

Passport.deserializeUser(async (id, done) => {
    let reCheck = await UserModel.findById(id);
    reCheck ? done(null, reCheck) : done(null, false);
});

export default Passport;