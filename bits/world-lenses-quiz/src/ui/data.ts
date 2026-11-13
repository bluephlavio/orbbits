/**
 * The bank shipped with the Bit, loaded once, through the editorial review that holds back
 * items not yet verified (src/data/review.json). The bank file itself is never modified.
 */
import raw from '../data/bank.json';
import review from '../data/review.json';
import { loadBank, readReview } from '../quiz/bank.ts';

export const BANK = loadBank(raw, readReview(review));
