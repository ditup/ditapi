'use strict';

module.exports = {
  // the url where the API lives
  url: {
    all: 'https://ditup.org/api'
  },
  // the url where the app lives
  appUrl: {
    all: 'https://ditup.org',
    verifyEmail: (username, code) => `/verify-email/${username}/${code}`,
    resetPassword: (username, code) => `/reset-password/${username}/${code}`
  },
  // password hashing and other
  security: {
    // iterations for pbkdf2 hashing of passwords
    iterations: 10000
  },
  // randomization of user's location
  randomLocationOffset: {
    min: 1000, // meters
    max: 2000 // meters
  },
  // when can unverified users be deleted
  unverifiedUsersTTL: 24 * 3600 * 1000, // 1 day in milliseconds
  // when should email-verification code expire
  emailVerificationCodeExpire: 2 * 3600 * 1000, // 2 hours in milliseconds
  // when should reset-password code expire
  resetPasswordCodeExpire: 30 * 60 * 1000, // 30 minutes in milliseconds
  // options for CORS (Cross Origin Resource Sharing)
  cors: {
    // a whitelist of Origin domains
    origin: [],
    // allowed methods
    methods: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST'],
    // allowed headers
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  jwt: { expirationTime: '7d' },

  carrotPoem: {
    text: `Trzy zające sobie szły
i skakały wszystkie trzy.
Mój zajączku naucz mnie,
ja tak samo skakać chcę.

Każdy zając marchew jada,
to na skoki świetna rada.
Hop, sa,sa, ram, pam, pam
Od marchewki siłę mam.
Hop, sa,sa, ram, pam, pam
Od marchewki siłę mam.

Cztery kozy poszły w las
i skakały cały czas.
Moja kozo naucz mnie,
ja tak samo skakać chcę.

Jem marchewkę na surowo,
bo to smacznie, bo to zdrowo.
Hop, sa,sa, ram, pam, pam
Od marchewki siłę mam.
Hop, sa,sa, ram, pam, pam
Od marchewki siłę mam.

Pięć baranków drogą szło
i skakało, że ho, ho.
Mój baranku naucz mnie
ja tak samo skakać chcę.

Czy jesienią czy to latem
na kolację jam sałatę i marchewkę także jem.
Hop, sa,sa, ram, pam, pam
Od marchewki siłę mam.
Hop, sa,sa, ram, pam, pam
Od marchewki siłę mam.`
  }
};
