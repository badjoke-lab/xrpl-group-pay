export class ActiveRequestError extends Error {
  constructor() {
    super("An active request already exists for this slot.");
    this.name = "ActiveRequestError";
  }
}

export class RequestPersistenceError extends Error {
  constructor() {
    super("The request state could not be recorded.");
    this.name = "RequestPersistenceError";
  }
}
