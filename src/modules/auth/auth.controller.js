const { User } = require('../user/user.model');
const { validationResult } = require('express-validator');

exports.getLogin = (req, res) => {
    res.render('auth/login', { title: 'Login' });
};

exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).render('auth/login', {
                error: 'Invalid credentials',
                email
            });
        }

        const isMatch = await user.validatePassword(password);
        if (!isMatch) {
            return res.status(400).render('auth/login', {
                error: 'Invalid credentials',
                email
            });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.getRegister = (req, res) => {
    res.render('auth/register', { title: 'Register' });
};

exports.postRegister = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).render('auth/register', {
            errors: errors.array(),
            ...req.body
        });
    }

    try {
        const { username, email, password } = req.body;

        let user = await User.findOne({ where: { email } });
        if (user) {
            return res.status(400).render('auth/register', {
                error: 'Email is already registered',
                ...req.body
            });
        }

        user = await User.create({ username, email, password });

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        req.session.save(() => {
            res.redirect('/dashboard');
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', { message: 'Server Error' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};