import { ClientSession, MongoError, MongoErrorLabel } from "mongodb";

import logger from "../utils/logger/logger.js";

const log = logger.default;


export async function runTransactionWithRetry(txnFunc: Function, session: ClientSession, maxRetries: number = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      session.startTransaction();
      log.debug(`Executing transactrion`, { session: session.id, txnNumber: session.serverSession.txnNumber });

      await txnFunc();
      await commitWithRetry(session);

      // transaction successful: return
      return;
    }
    catch (error: any) {
      // console.dir(error.writeErrors, { depth: null });
      await session.abortTransaction();

      if (error instanceof MongoError && error.hasErrorLabel(MongoErrorLabel.TransientTransactionError)) {
        continue; // retry transaction
      } else {
        log.error('An error occured in the transaction, performing a data rollback:' + error);
        throw error;
      }
    }
  }

  throw new Error("Reached maximum number of retries.");
}

export async function commitWithRetry(session: ClientSession, maxRetries: number = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await session.commitTransaction();

      log.info('Transaction committed.');
      return;

    } catch (error: any) {
      if (error instanceof MongoError && error.hasErrorLabel(MongoErrorLabel.UnknownTransactionCommitResult)) {
        console.log('UnknownTransactionCommitResult, retrying commit operation ...');
      } else {
        console.log('Error during commit ...');
        throw error;
      }
    }
  }

  throw new Error("Reached maximum number of retries.");
  ;
}