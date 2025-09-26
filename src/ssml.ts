/**
 * SSML (Speech Synthesis Markup Language) is a subset of XML specifically
 * designed for controlling synthesis. You can see examples of how the SSML
 * should be parsed in `ssml.test.ts`.
 *
 * DO NOT USE CHATGPT, COPILOT, OR ANY AI CODING ASSISTANTS.
 * Conventional auto-complete and Intellisense are allowed.
 *
 * DO NOT USE ANY PRE-EXISTING XML PARSERS FOR THIS TASK.
 * You may use online references to understand the SSML specification, but DO NOT read
 * online references for implementing an XML/SSML parser.
 */

/** Parses SSML to a SSMLNode, throwing on invalid SSML */
export function parseSSML(ssml: string): SSMLNode {
  // NOTE: Don't forget to run unescapeXMLChars on the SSMLText
  ssml = unescapeXMLChars(ssml.trim())
  if (!ssml.startsWith('<') || !ssml.endsWith('>')) {
    throw new Error('Invalid SSML: Must start with < and end with >')
  }
  // Check for single top-level <speak> tag, use greedy match for inner content
  const tagMatch = ssml.match(/<\s*(\w+)([^>]*)>((?:.*)?)<\/\s*(\w+)\s*>/s)
  if (!tagMatch) {
    throw new Error('Invalid SSML: No valid tags found')
  }
  const tagName = tagMatch[1];
  const closingTagName = tagMatch[4];
  if (tagName !== 'speak') {
    throw new Error('Invalid SSML: Root tag must be <speak>')
  }
  if (tagName !== closingTagName) {
    throw new Error('Invalid SSML: Mismatched closing tag or multiple top-level tags')
  }

  function parseSSMLRecursive(ssml: string): SSMLNode {
    const tagMatch = ssml.match(/<\s*(\w+)([^>]*)>(.*?)<\/\s*\1\s*>/s) || ssml.match(/<\s*(\w+)((?:.*)?)()\/>/s)
    if (!tagMatch) {
      return ssml;
    }

    const tagName = tagMatch[1];
    const attrString = tagMatch[2].trim() || '';
    const attributesParsed = attrString ? attrString.trim().match(/([\w:]+)\s*(=\s*(["'])(.*?)\3)*/g) : []
    const attributesArray: SSMLAttribute[] = attributesParsed ? (attributesParsed.map(attr => {
      const [name, value] = attr.split('=');
      if (value === undefined) {
        throw new Error('Invalid SSML: Attribute without value');
      }
      return { name: name.trim(), value: value.trim().slice(1, -1) };
    })) : [];
    const innerContent: string | undefined = tagMatch[3];
    if (innerContent.includes('<') && innerContent.includes('>')) {
      const splitInnerContent = innerContent.split(/(<[^>]+>)/g).filter(part => part.length > 0);
      const children: string[] = [];
      let successor = '';
      for (const part of splitInnerContent) {
        if (part.startsWith('<') && part.endsWith('>')) {
          if (successor.length == 0) {
            // Check for closing tag
            if (/<\s*\/\s*\w+\s*>/s.test(part)) {
              throw new Error('Invalid SSML: Mismatched closing tag or multiple top-level tags');
            }
            if (/<\s*\w+((?:.*)?)\/>/s.test(part)) {
              // self-closing tag
              children.push(part);
              continue;
            }
            // opening tag
            const childNode = part.match(/<\s*(\w+)([^>]*)>/s);
            successor = childNode ? childNode[1] : '';
            children.push(part);
          } else {
            const childNode = part.match(/<\s*\/\s*(\w+)\s*>/s);
            const closingTagName = childNode ? childNode[1] : '';
            if (closingTagName === successor) {
              successor = '';
            }
            children[children.length - 1] += part;
          }
        } else {
          if (!successor) {
            children.push(part);
          } else {
            children[children.length - 1] += part;
          }
        }
      }
      if (successor.length > 0) {
        throw new Error('Invalid SSML: Mismatched closing tag or multiple top-level tags');
      }
      return {
        name: tagName,
        attributes: attributesArray,
        children: children.map(part => parseSSMLRecursive(part)),
      };
    }
    return {
      name: tagName,
      attributes: attributesArray,
      children: innerContent ? [parseSSMLRecursive(innerContent)] : [],
    }
  }
  return parseSSMLRecursive(ssml);
}

/** Recursively converts SSML node to string and unescapes XML chars */
export function ssmlNodeToText(node: SSMLNode): string {
  if (typeof node === 'string') {
    return node;
  }
  if (node.children.length === 0) {
    return '';
  }
  return node.children.map(ssmlNodeToText).join('');
}

// Already done for you
const unescapeXMLChars = (text: string) =>
  text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')

type SSMLNode = SSMLTag | SSMLText
type SSMLTag = {
  name: string
  attributes: SSMLAttribute[]
  children: SSMLNode[]
}
type SSMLText = string
type SSMLAttribute = { name: string; value: string }
