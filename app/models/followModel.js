const { required } = require('joi');
const mongoose = require('mongoose');
const { create } = require('./partnerModel');

//follow relationship schema
const followSchema = new mongoose.Schema({
    follower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true
    },
    following: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
//follow request schema (for private accounts)
const followRequestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true
    },
   
    target: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Partner',
        required: true
    },
    status: {
        type: String,
        enum: ['pending'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

//Indexes
followSchema.index({ follower: 1, following: 1}, {unique: true});
followRequestSchema.index({ requester: 1, target: 1}, { unique: true});

const Follow = mongoose.model('Follow', followSchema);
const FollowRequest = mongoose.model('FollowRequest', followRequestSchema);

module.exports = { Follow, FollowRequest};