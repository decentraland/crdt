import { crdtProtocol, Message, State } from '../src'
import expect from 'expect'

function compareData(a: Buffer, b: Buffer) {
  return a.equals(b)
}

function compareStatePayloads(states: State<Buffer>[]) {
  if (!states.length) {
    return true
  }
  const keys = Object.keys(states[0])
  console.log(states)
  return states.every(
    (s) =>
      s.length === states[0].length &&
      keys.every((key) => compareData(s[key].data, states[0][key].data))
  )
}

type Sandbox = {
  clientLength: number
}

function createSandbox(opts: Sandbox) {
  let id = 0
  const getId = () => {
    id = id + 1
    return id.toString()
  }
  const broadcast = (uuid: string) => ({
    send: async (message: Message<Buffer>) => {
      await Promise.all(
        clients.map((c) => c.getUUID() !== uuid && c.processMessage(message))
      )
    }
  })

  const clients = Array.from({
    length: opts.clientLength
  }).map(() => {
    const uuid = getId()
    const ws = broadcast(uuid)
    return crdtProtocol<Buffer>(async (message: Message<Buffer>) => {
      await ws.send(message)
    }, uuid)
  })

  function compare() {
    expect(compareStatePayloads(clients.map((c) => c.getState()))).toBe(true)
  }

  return {
    compare,
    clients
  }
}

beforeEach(() => {})

describe('CRDT protocol', () => {
  it('should store the message A in all the clients', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA] = clients
    const messageA = clientA.createEvent('key-A', Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    compare()
  })

  it('same as before but with more clients (N > 2)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 20 })
    const [clientA] = clients
    const messageA = clientA.createEvent('key-A', Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    compare()
  })

  it('should decline message A if both messages are sent at the same time and data B > data A', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key = 'key-A'

    const messageA = clientA.createEvent(key, Buffer.from('boedo'))
    const messageB = clientB.createEvent(key, Buffer.from('casla'))
    await Promise.all([
      clientA.sendMessage(messageA),
      clientB.sendMessage(messageB)
    ])

    compare()
    expect(compareData(clientA.getState()[key].data, messageB.data)).toBe(true)
  })

  it('same as before but with more clients (N > 2)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 20 })
    const [clientA, clientB] = clients
    const key = 'key-A'
    const messageA = clientA.createEvent(key, Buffer.from('boedo'))
    const messageB = clientB.createEvent(key, Buffer.from('casla'))
    await Promise.all([
      clientA.sendMessage(messageA),
      clientB.sendMessage(messageB)
    ])
    compare()
    expect(compareData(clientA.getState()[key].data, messageB.data)).toBe(true)
  })

  it('should store both keys', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA, clientB] = clients
    const keyA = 'key-A'
    const keyB = 'key-B'

    const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
    const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    await clientB.sendMessage(messageB)

    const messageB2 = clientB.createEvent(keyB, Buffer.from('sand'))
    const messageA2 = clientA.createEvent(keyB, Buffer.from('holaholaholahola'))
    await Promise.all([
      clientB.sendMessage(messageB2),
      clientA.sendMessage(messageA2)
    ])
    compare()
  })

  it('should store both keys, even if we send the messages in diff order (sand before holahola)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 2 })
    const [clientA, clientB] = clients
    const keyA = 'key-A'
    const keyB = 'key-B'

    const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
    const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    await clientB.sendMessage(messageB)

    const messageB2 = clientB.createEvent(keyB, Buffer.from('sand'))
    const messageA2 = clientA.createEvent(keyB, Buffer.from('holaholaholahola'))
    await Promise.all([
      clientA.sendMessage(messageA2),
      clientB.sendMessage(messageB2)
    ])
    compare()
  })

  it('same as before but with more clients (N > 2)', async () => {
    const { clients, compare } = createSandbox({ clientLength: 20 })
    const [clientA, clientB, clientC] = clients
    const keyA = 'key-A'
    const keyB = 'key-B'

    const messageA = clientA.createEvent(keyA, Buffer.from('boedo'))
    const messageB = clientB.createEvent(keyB, Buffer.from('casla'))
    await clientA.sendMessage(messageA)
    await clientB.sendMessage(messageB)

    const messageB2 = clientB.createEvent(keyB, Buffer.from('sand'))
    const messageC = clientC.createEvent(keyB, Buffer.from('hola'))
    await Promise.all([
      clientB.sendMessage(messageB2),
      clientC.sendMessage(messageC)
    ])
    compare()
  })
})
