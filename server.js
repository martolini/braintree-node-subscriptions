import express, { Router } from 'express'
import { gateway } from './config'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'

const generateClientToken = Promise.promisify(gateway.clientToken.generate, { context: gateway.clientToken })
const createCustomer = Promise.promisify(gateway.customer.create, { context: gateway.customer })
const createPaymentMethod = Promise.promisify(gateway.paymentMethod.create, { context: gateway.paymentMethod })
const updatePaymentMethod = Promise.promisify(gateway.paymentMethod.update, { context: gateway.paymentMethod })
const createSubscription = Promise.promisify(gateway.subscription.create, { context: gateway.subscription })

const authMiddleware = (req, res, next) => {
  const { token } = req.headers
  if (!token) {
    return res.status(401).send('You need to pass in a token')
  }
  mongoose.model('Customer').findOne({uid: token})
    .then(customer => {
      req.customer = customer
      next()
    }).catch(err => {
      res.status(401).send('You are not allowed to be here')
    })
}

export const server = express()
server.use(bodyParser.json())

const router = Router()

router.post('/create-customer', (req, res) => {
  createCustomer(req.body)
    .then(result => {
      return mongoose.model('Customer').createCustomer(result.customer.id)
        .then(() => {
          res.json({success: result.success, customerId: result.customer.id})
        })
    }).catch(err => {
      return res.status(400).send(err)
    })
})

router.post('/client-token', authMiddleware, (req, res) => {
  generateClientToken({
    customerId: req.customer.uid
  }).then((result) => {
      res.json({clientToken: result.clientToken})
    }).catch(err => {
      res.status(400).send(err)
    })
})

router.post('/create-payment-method', authMiddleware, (req, res) => {
  const { nonce } = req.body
  createPaymentMethod({
    customerId: req.customer.uid,
    paymentMethodNonce:nonce,
    options:{ verifyCard: true }
  }).then(result => {
    if (!result.success) {
      throw new Error('Not successful')
    }
    return req.customer.updateToken(result.paymentMethod.token)
      .then(() => res.json({success: true}))
  }).catch(err => {
    res.status(400).send(err)
  })
})

router.post('/update-payment-method', authMiddleware, (req, res) => {
  const { nonce } = req.body
  if (!req.customer.token) {
    return res.status(401).send('This customer has no token')
  }
  updatePaymentMethod(req.customer.token, {
    paymentMethodNonce: nonce
  }).then(result => {
    const { token } = result.paymentMethod
    return req.customer.updateToken(token)
  }).then(() => res.json({success: true}))
  .catch(err => {
    res.status(400).send(err)
  })
})

router.post('/subscribe', authMiddleware, (req, res) => {
  const { plan } = req.body
  if (!plan || !req.customer.token)
    return res.status(400).send('You need a plan and a token to subscribe.')
  req.customer.subscribe(plan)
    .then(result => {
      res.json({plan: result.subscription.plan})
    }).catch(err => {
      console.log(err)
      res.status(500).send(err)
    })
})


server.use(router)

