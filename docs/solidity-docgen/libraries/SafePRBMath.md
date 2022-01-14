Smart contract library for advanced fixed-point math that works with uint256 numbers considered to have 18
trailing decimals. We call this number representation unsigned 60.18-decimal fixed-point, since there can be up to 60
digits in the integer part and up to 18 decimals in the fractional part. The numbers are bound by the minimum and the
maximum values permitted by the Solidity type uint256.


## Functions
### avg
```solidity
  function avg(
    uint256 x,
    uint256 y
  ) internal returns (uint256 result)
```
Calculates the arithmetic average of x and y, rounding down.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The first operand as an unsigned 60.18-decimal fixed-point number.
|`y` | uint256 | The second operand as an unsigned 60.18-decimal fixed-point number.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The arithmetic average as an unsigned 60.18-decimal fixed-point number.
### ceil
```solidity
  function ceil(
    uint256 x,
     result
  ) internal returns (uint256 result)
```
Yields the least unsigned 60.18 decimal fixed-point number greater than or equal to x.


Optimized for fractional value inputs, because for every whole value there are (1e18 - 1) fractional counterparts.
See https://en.wikipedia.org/wiki/Floor_and_ceiling_functions.

Requirements:
- x must be less than or equal to MAX_WHOLE_UD60x18.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number to ceil.
|`result` |  | The least integer greater than or equal to x, as an unsigned 60.18-decimal fixed-point number.

### div
```solidity
  function div(
    uint256 x,
    uint256 y,
     result
  ) internal returns (uint256 result)
```
Divides two unsigned 60.18-decimal fixed-point numbers, returning a new unsigned 60.18-decimal fixed-point number.


Uses mulDiv to enable overflow-safe multiplication and division.

Requirements:
- The denominator cannot be zero.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The numerator as an unsigned 60.18-decimal fixed-point number.
|`y` | uint256 | The denominator as an unsigned 60.18-decimal fixed-point number.
|`result` |  | The quotient as an unsigned 60.18-decimal fixed-point number.

### e
```solidity
  function e(
  ) internal returns (uint256 result)
```
Returns Euler's number as an unsigned 60.18-decimal fixed-point number.

See https://en.wikipedia.org/wiki/E_(mathematical_constant).


### exp
```solidity
  function exp(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates the natural exponent of x.


Based on the insight that e^x = 2^(x * log2(e)).

Requirements:
- All from "log2".
- x must be less than 133.084258667509499441.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The exponent as an unsigned 60.18-decimal fixed-point number.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The result as an unsigned 60.18-decimal fixed-point number.
### exp2
```solidity
  function exp2(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates the binary exponent of x using the binary fraction method.


See https://ethereum.stackexchange.com/q/79903/24693.

Requirements:
- x must be 192 or less.
- The result must fit within MAX_UD60x18.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The exponent as an unsigned 60.18-decimal fixed-point number.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The result as an unsigned 60.18-decimal fixed-point number.
### floor
```solidity
  function floor(
    uint256 x,
     result
  ) internal returns (uint256 result)
```
Yields the greatest unsigned 60.18 decimal fixed-point number less than or equal to x.

Optimized for fractional value inputs, because for every whole value there are (1e18 - 1) fractional counterparts.
See https://en.wikipedia.org/wiki/Floor_and_ceiling_functions.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number to floor.
|`result` |  | The greatest integer less than or equal to x, as an unsigned 60.18-decimal fixed-point number.

### frac
```solidity
  function frac(
    uint256 x,
     result
  ) internal returns (uint256 result)
```
Yields the excess beyond the floor of x.

Based on the odd function definition https://en.wikipedia.org/wiki/Fractional_part.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number to get the fractional part of.
|`result` |  | The fractional part of x as an unsigned 60.18-decimal fixed-point number.

### fromUint
```solidity
  function fromUint(
    uint256 x,
     result
  ) internal returns (uint256 result)
```
Converts a number from basic integer form to unsigned 60.18-decimal fixed-point representation.


Requirements:
- x must be less than or equal to MAX_UD60x18 divided by SCALE.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The basic integer to convert.
|`result` |  | The same number in unsigned 60.18-decimal fixed-point representation.

### gm
```solidity
  function gm(
    uint256 x,
    uint256 y
  ) internal returns (uint256 result)
```
Calculates geometric mean of x and y, i.e. sqrt(x * y), rounding down.


Requirements:
- x * y must fit within MAX_UD60x18, lest it overflows.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The first operand as an unsigned 60.18-decimal fixed-point number.
|`y` | uint256 | The second operand as an unsigned 60.18-decimal fixed-point number.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The result as an unsigned 60.18-decimal fixed-point number.
### inv
```solidity
  function inv(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates 1 / x, rounding toward zero.


Requirements:
- x cannot be zero.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number for which to calculate the inverse.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The inverse as an unsigned 60.18-decimal fixed-point number.
### ln
```solidity
  function ln(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates the natural logarithm of x.


Based on the insight that ln(x) = log2(x) / log2(e).

Requirements:
- All from "log2".

Caveats:
- All from "log2".
- This doesn't return exactly 1 for 2.718281828459045235, for that we would need more fine-grained precision.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number for which to calculate the natural logarithm.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The natural logarithm as an unsigned 60.18-decimal fixed-point number.
### log10
```solidity
  function log10(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates the common logarithm of x.


First checks if x is an exact power of ten and it stops if yes. If it's not, calculates the common
logarithm based on the insight that log10(x) = log2(x) / log2(10).

Requirements:
- All from "log2".

Caveats:
- All from "log2".


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number for which to calculate the common logarithm.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The common logarithm as an unsigned 60.18-decimal fixed-point number.
### log2
```solidity
  function log2(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates the binary logarithm of x.


Based on the iterative approximation algorithm.
https://en.wikipedia.org/wiki/Binary_logarithm#Iterative_approximation

Requirements:
- x must be greater than or equal to SCALE, otherwise the result would be negative.

Caveats:
- The results are nor perfectly accurate to the last decimal, due to the lossy precision of the iterative approximation.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number for which to calculate the binary logarithm.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The binary logarithm as an unsigned 60.18-decimal fixed-point number.
### mul
```solidity
  function mul(
    uint256 x,
    uint256 y
  ) internal returns (uint256 result)
```
Multiplies two unsigned 60.18-decimal fixed-point numbers together, returning a new unsigned 60.18-decimal
fixed-point number.

See the documentation for the "PRBMath.mulDivFixedPoint" function.

#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The multiplicand as an unsigned 60.18-decimal fixed-point number.
|`y` | uint256 | The multiplier as an unsigned 60.18-decimal fixed-point number.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The product as an unsigned 60.18-decimal fixed-point number.
### pi
```solidity
  function pi(
  ) internal returns (uint256 result)
```
Returns PI as an unsigned 60.18-decimal fixed-point number.



### pow
```solidity
  function pow(
    uint256 x,
    uint256 y
  ) internal returns (uint256 result)
```
Raises x to the power of y.


Based on the insight that x^y = 2^(log2(x) * y).

Requirements:
- All from "exp2", "log2" and "mul".

Caveats:
- All from "exp2", "log2" and "mul".
- Assumes 0^0 is 1.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | Number to raise to given power y, as an unsigned 60.18-decimal fixed-point number.
|`y` | uint256 | Exponent to raise x to, as an unsigned 60.18-decimal fixed-point number.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | x raised to power y, as an unsigned 60.18-decimal fixed-point number.
### powu
```solidity
  function powu(
    uint256 x,
    uint256 y
  ) internal returns (uint256 result)
```
Raises x (unsigned 60.18-decimal fixed-point number) to the power of y (basic unsigned integer) using the
famous algorithm "exponentiation by squaring".


See https://en.wikipedia.org/wiki/Exponentiation_by_squaring

Requirements:
- The result must fit within MAX_UD60x18.

Caveats:
- All from "mul".
- Assumes 0^0 is 1.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The base as an unsigned 60.18-decimal fixed-point number.
|`y` | uint256 | The exponent as an uint256.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The result as an unsigned 60.18-decimal fixed-point number.
### scale
```solidity
  function scale(
  ) internal returns (uint256 result)
```
Returns 1 as an unsigned 60.18-decimal fixed-point number.



### sqrt
```solidity
  function sqrt(
    uint256 x
  ) internal returns (uint256 result)
```
Calculates the square root of x, rounding down.

Uses the Babylonian method https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method.

Requirements:
- x must be less than MAX_UD60x18 / SCALE.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number for which to calculate the square root.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The result as an unsigned 60.18-decimal fixed-point .
### toUint
```solidity
  function toUint(
    uint256 x
  ) internal returns (uint256 result)
```
Converts a unsigned 60.18-decimal fixed-point number to basic integer form, rounding down in the process.


#### Parameters:
| Name | Type | Description                                                          |
| :--- | :--- | :------------------------------------------------------------------- |
|`x` | uint256 | The unsigned 60.18-decimal fixed-point number to convert.

#### Return Values:
| Name                           | Type          | Description                                                                  |
| :----------------------------- | :------------ | :--------------------------------------------------------------------------- |
|`result`| uint256 | The same number in basic integer form.
