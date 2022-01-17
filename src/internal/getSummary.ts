import { Event, Suite } from 'benchmark'
import { Summary } from './common-types'
import getCaseResult from './getCaseResult'

type GetSummary = (event: Event, precision: number) => Summary

const roundNumbersToDistinctValues = (
  numbers: number[],
  precision: number,
): number[] => {
  const rounded = numbers.map((num) => {
    return Math.round(num * 10 ** precision) / 10 ** precision
  })

  const originalSizeWithoutDuplicates = new Set(numbers).size
  const roundedSizeWithoutDuplicates = new Set(rounded).size

  return roundedSizeWithoutDuplicates === originalSizeWithoutDuplicates
    ? rounded
    : roundNumbersToDistinctValues(numbers, precision + 1)
}

const getSummary: GetSummary = (event, precision) => {
  const currentTarget = event.currentTarget as Suite

  const resultsWithoutRoundedOps = Object.entries(currentTarget)
    .filter(([key]) => !Number.isNaN(Number(key)))
    .map(([_, target]) => getCaseResult(target))

  const roundedOps = roundNumbersToDistinctValues(
    resultsWithoutRoundedOps.map((result) => result.ops),
    precision,
  )
  const results = resultsWithoutRoundedOps.map((result, index) => ({
    ...result,
    ops: roundedOps[index],
  }))

  const fastestCases = currentTarget.filter('fastest').map('id') as number[]

  const fastestIndexes = fastestCases.map((id) => results.findIndex(c => c.id === id))

  const slowestCases = (
    currentTarget.filter('slowest').map('id') as number[]
  ).filter(id => !fastestCases.includes(id))

  const slowestIndexes = slowestCases.map((id) => results.findIndex(c => c.id === id))

  const resultsWithDiffs = results.map((result, index) => {
    const percentSlower =
      index === fastestIndexes[0]
        ? 0
        : Number(
          ((1 - result.ops / results[fastestIndexes[0]].ops) * 100).toFixed(2),
        )

    return { ...result, percentSlower }
  })

  return {
    // @ts-ignore
    name: event.currentTarget.name,
    date: new Date(event.timeStamp),
    results: resultsWithDiffs,
    fastest: fastestIndexes.map(index => ({
      name: results[index].name,
      index,
    })),
    slowest: slowestIndexes.map(index => ({
      name: results[index].name,
      index,
    })),
  }
}

export default getSummary
