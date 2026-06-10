import { copyDate } from '@/write/shared/DateUtils'
import type {
  FinancialTransaction,
  NonRefundableDeposit,
  NonRefundableDepositReversal
} from '@/write/shared/vo/FinancialTransaction'
import { copyFinancialTransaction } from '@/write/shared/vo/FinancialTransaction'
import { Money } from '@/write/shared/vo/Money'

const transactionBalanceImpactMinor = (
  transaction: FinancialTransaction
): number => {
  if (
    transaction.type === 'payment' ||
    transaction.type === 'non_refundable_deposit_reversal'
  ) {
    return transaction.amount.amountMinor
  }

  return -transaction.amount.amountMinor
}

const copyNonRefundableDeposit = (
  deposit: NonRefundableDeposit
): NonRefundableDeposit => ({
  type: 'non_refundable_deposit',
  id: deposit.id,
  amount: Money.create(deposit.amount.toSnapshot()),
  note: deposit.note,
  createdAt: copyDate(deposit.createdAt)
})

export class CampParticipantLedger {
  private constructor(private readonly transactions: FinancialTransaction[]) {}

  public static from(
    transactions: FinancialTransaction[]
  ): CampParticipantLedger {
    return new CampParticipantLedger(transactions.map(copyFinancialTransaction))
  }

  public balanceMinor(): number {
    return this.transactions.reduce(
      (balance, transaction) =>
        balance + transactionBalanceImpactMinor(transaction),
      0
    )
  }

  public remainingAmountToPay(totalAmountDue: Money): Money {
    return Money.create({
      amountMinor: Math.max(
        totalAmountDue.amountMinor - this.balanceMinor(),
        0
      ),
      currency: totalAmountDue.currency
    })
  }

  public unreversedNonRefundableDeposits(): NonRefundableDeposit[] {
    const reversedDepositIds = new Set(
      this.transactions
        .filter(
          (transaction): transaction is NonRefundableDepositReversal =>
            transaction.type === 'non_refundable_deposit_reversal'
        )
        .map((transaction) => transaction.reversedTransactionId)
    )

    return this.transactions
      .filter(
        (transaction): transaction is NonRefundableDeposit =>
          transaction.type === 'non_refundable_deposit' &&
          !reversedDepositIds.has(transaction.id)
      )
      .map(copyNonRefundableDeposit)
  }
}
