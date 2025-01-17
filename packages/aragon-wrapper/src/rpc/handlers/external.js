import { fromEvent, from } from 'rxjs'
import { delay } from 'rxjs/operators'
import { getConfiguration } from '../../configuration'
import * as configurationKeys from '../../configuration/keys'

export function call (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    methodJsonDescription,
    ...params
  ] = request.params

  const contract = new web3.eth.Contract(
    [methodJsonDescription],
    address
  )

  return contract.methods[methodJsonDescription.name](...params).call()
}

export async function intent (request, proxy, wrapper) {
  const [
    address,
    methodJsonDescription,
    ...params
  ] = request.params

  const transactionPath = await wrapper.getExternalTransactionPath(
    address,
    methodJsonDescription,
    params
  )

  return wrapper.performTransactionPath(transactionPath, { external: true })
}

export function events (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    jsonInterface,
    providedFromBlock
  ] = request.params
  // Use the app proxy's initialization block by default
  const fromBlock = providedFromBlock == null ? proxy.initializationBlock : providedFromBlock

  const contract = new web3.eth.Contract(
    jsonInterface,
    address
  )

  const eventSource = fromEvent(
    contract.events.allEvents({
      fromBlock
    }), 'data'
  )

  const eventDelay = getConfiguration(configurationKeys.SUBSCRIPTION_EVENT_DELAY) || 0
  // Small optimization: don't pipe a delay if we don't have to
  return eventDelay ? eventSource.pipe(delay(eventDelay)) : eventSource
}

export function pastEvents (request, proxy, wrapper) {
  const web3 = wrapper.web3
  const [
    address,
    jsonInterface,
    options
  ] = request.params

  const contract = new web3.eth.Contract(
    jsonInterface,
    address
  )
  // ensure it's an object
  const eventsOptions = {
    ...options
  }

  eventsOptions.fromBlock = eventsOptions.fromBlock || proxy.initializationBlock

  return from(
    contract.getPastEvents('allEvents', eventsOptions)
  )
}
