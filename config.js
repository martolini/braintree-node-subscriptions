import Promise from 'bluebird'
import mongoose from 'mongoose'
mongoose.Promise = global.Promise = Promise
import braintree from 'braintree'
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load()
}

export const gateway = braintree.connect({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY
})


export const BRAINTREE_PLANS = {
  prom: {
    price: 99.99,
    billingCycle: 1
  },
  proq: {
    price: 249.99,
    billingCycle: 3
  },
  hobby: {
    price: 29.99,
    billingCycle: 1
  }
}

require('./models')
