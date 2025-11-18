import mongoose from 'mongoose';

const sequenceCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
}, { collection: 'sequence_counters' })

sequenceCounterSchema.statics.getNextSequence = async function (name) {
  const result = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  return result.seq
}

const SequenceCounter = mongoose.model('SequenceCounter', sequenceCounterSchema)
export default SequenceCounter


