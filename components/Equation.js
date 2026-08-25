import * as React from 'react'

import Katex from '@/components/KatexReact'
import { getBlockTitle } from 'notion-utils'

const katexSettings = {
  throwOnError: false,
  strict: false
}

/**
 * 数学公式
 * @param {} param0
 * @returns
 */
export const Equation = ({ block, math, inline = false, className, ...rest }) => {
  math = math || getBlockTitle(block, null)
  if (!math) return null

  const settings = {
    ...katexSettings,
    displayMode: !inline
  }

  return (
    <span
      role='button'
      tabIndex={0}
      className={`notion-equation ${inline ? 'notion-equation-inline' : 'notion-equation-block'} ${className || ''}`}
    >
      <Katex math={math} settings={settings} {...rest} />
    </span>
  )
}
