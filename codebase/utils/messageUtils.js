/**
 * Keys and combinations that complete certain actions.
 */
const specialKeys = {
  /** Ctrl + C */
  exit: 3,
  enter: 13,
  backspace: 127,
  delete: 458961790,
  leftArrow: 1792836,
  rightArrow: 1792835,
  newline: '\r\n',

  unhandled: [
    1792833, 1792834, 30078481937729, 30078481937730, 30078481937732,
    30078481937731, 30078481936961, 30078481936962, 30078481936964,
    30078481936963, 30078481937217, 30078481937220, 30078481937218,
    30078481937219,
  ],
};

/**
 * Common and reusable message types.
 */
const commonMessages = {
  prompt: '> ',
  newlinePrompt: `${specialKeys.newline}> `,
};

module.exports = { specialKeys, commonMessages };
