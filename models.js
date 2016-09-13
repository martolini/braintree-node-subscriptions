import mongoose, { Schema } from 'mongoose'
import { gateway, BRAINTREE_PLANS } from './config'

const createSubscription = Promise.promisify(gateway.subscription.create, { context: gateway.subscription })
const updateSubscription = Promise.promisify(gateway.subscription.update, { context: gateway.subscription })
const cancelSubscription = Promise.promisify(gateway.subscription.cancel, { context: gateway.subscription })

const customerSchema = new Schema({
  uid: {
    type: String,
    index: true,
    unique: true
  },
  token: String,
  subscription: {
    _id: String,
    plan: String,
    status: String,
    price: Number,
    nextBillingDate: Date,
    paidThroughDate: Date
  }
})

customerSchema.statics.createCustomer = function(uid) {
  return this.create({
    uid
  })
}

customerSchema.methods.updateToken = function(token) {
  this.token = token
  return this.save()
}

customerSchema.methods.syncSubscription = function(subscription) {
  this.subscription = {
    _id: subscription.id,
    plan: subscription.planId,
    status: subscription.status,
    nextBillingDate: subscription.nextBillingDate,
    price: +subscription.price,
    paidThroughDate: subscription.paidThroughDate
  }
  return this.save()
}

customerSchema.methods.subscribe = function(plan) {
  return new Promise((resolve, reject) => {
    let promise = null
    if (!this.subscription._id || this.subscription.status === 'Canceled' || this.subscription.status === 'Expired') {
      promise = createSubscription({
        paymentMethodToken: this.token,
        planId: plan
      })
    } else if (BRAINTREE_PLANS[this.subscription.plan].billingCycle !== BRAINTREE_PLANS[plan].billingCycle) {
      promise = cancelSubscription(this.subscription._id).then(() => createSubscription({
        paymentMethodToken: this.token,
        planId: plan
      }))
    } else {
      promise = updateSubscription(this.subscription._id, {
        planId: plan,
        price: BRAINTREE_PLANS[plan].price
      })
    }
    promise
      .then(result => this.syncSubscription(result.subscription))
      .then(result => resolve(result))
      .catch(err => reject(err))
  })
}

export default mongoose.model('Customer', customerSchema)

