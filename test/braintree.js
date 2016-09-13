import { expect } from 'chai'
import { server } from '../server'
import request from 'supertest'
import { gateway } from '../config'
import mongoose from 'mongoose'

const agent = request(server)
const userId = 1337
const token = userId

describe('User management', () => {
  before(done => {
    mongoose.connect(process.env.DATABASE_URL)
      .then(() => mongoose.model('Customer').remove({}))
      .then(() => {
        gateway.customer.delete(userId, err => {
          done()
        })
      }).catch(done)
  })

  after(done => {
    mongoose.disconnect().then(done)
  })

  it('Should try to access without token', done => {
    agent
      .post('/client-token')
      .expect(401, done)
  })

  it('Should create a new customer', done => {
    agent
      .post('/create-customer')
      .send({
        id: userId,
        firstName: 'Martin',
        lastName: 'Roed',
        email: 'msroed@gmail.com'
      }).expect(200, done)
  })

  it('Should generate client token with userId', done => {
    agent
      .post('/client-token')
      .set('token', token)
      .send({uid: userId})
      .expect(200)
      .expect(res => {
        expect(res.body.clientToken).to.be.ok
      }).end(done)
  })

  it('Should create a payment method with invalid nonce', done => {
    agent
      .post('/create-payment-method')
      .set('token', token)
      .send({
        nonce: 'fake-invalid-nonce',
        uid: userId
      }).expect(400, done)
  })

  it('Should create a payment method with valid nonce', done => {
    agent
      .post('/create-payment-method')
      .set('token', token)
      .send({
        nonce: 'fake-valid-nonce',
        uid: userId
      }).expect(200, done)
  })

  it('Should update payment method', done => {
    agent
      .post('/update-payment-method')
      .set('token', token)
      .send({
        uid: userId,
        nonce: 'fake-valid-nonce'
      }).expect(200, done)
  })

  it('Should subscribe to hobby', done => {
    agent
    .post('/subscribe')
    .set('token', token)
    .send({
      plan: 'hobby'
    }).expect(200, done)
  })

  it('Should update payment method and payment method on subscription', done => {
    agent
      .post('/update-payment-method')
      .set('token', token)
      .send({
        nonce: 'fake-valid-mastercard-nonce'
      }).expect(200, done)
  })

  it('Should upgrade to pro', done => {
    agent
      .post('/subscribe')
      .set('token', token)
      .send({
        plan: 'prom'
      }).expect(res => {
        expect(res.body.plan).to.equal('prom')
      }).expect(200, done)
  })

  it('Should upgrade to proq', done => {
    agent
      .post('/subscribe')
      .set('token', token)
      .send({
        plan: 'proq'
      }).expect(res => {
        expect(res.body.plan).to.equal('proq')
      }).expect(200, done)
  })
})
