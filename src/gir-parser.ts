import { parseXml, Element } from "libxmljs";
import { isReserved, indent } from './utils';

const GIR_PATHS = ["/usr/share/gir-1.0/*.gir", "/usr/share/*/gir-1.0/*.gir"];
const XMLNS = "http://www.gtk.org/introspection/core/1.0";

const TYPEMAP = {
  gboolean: "bool",
  gint: "number",
  guint: "number",
  gint64: "number",
  guint64: "number",
  none: "null",
  gchar: "string",
  guchar: "string",
  "gchar*": "string",
  "guchar*": "string",
  glong: "number",
  gulong: "number",
  glong64: "number",
  gulong64: "number",
  gfloat: "number",
  gdouble: "number",
  string: "string",
  GString: "string",
  utf8: "string"
};

interface Parameter {
  name: string;
  type: string;
  doc: string;
}

interface ReturnType {
  doc: string;
  type: string;
}

export var options = {
  documentation: true
};

/**
 * Returns the TypeScript type from native GObject type
 *
 * @param {string} typename Native type
 * @returns {string} TypeScript type
 */
function getTSType(typename: string) {
  typename = typename.replace("const ", "");
  try {
    return TYPEMAP[typename];
  } catch {
    return "any";
  }
}
/**
 * Returns the documentation for the current object
 *
 * @param {Element} element Given XMLElement to fetch the documentation of
 * @returns {string} The documentation itself.
 */
function getDocstring(element: Element) {
  for (let node of element.childNodes()) {
    if (node.name() == "doc") return node.text().replace("\\x", "x");
  }

  return "";
}
/**
 * Returns native parameter type for a given object
 *
 * @param {Element} element The element which to get the object from
 * @returns {string} the native type the object is made up of
 */
function getParameterType(element: Element) {
  for (let node of element.childNodes()) {
    if (node.name() == "type") {
      return getTSType(node.attr("name").value());
    }
  }

  return "";
}
/**
 * Retuns documentation for the chosen parameter
 *
 * @param {Element} element XML Element representing the parameter
 * @returns {string} documentation for the parameter
 */
function getParameterDoc(element: Element) {
  for (let node of element.childNodes()) {
    if (node.name() == "doc")
      return node
        .text()
        .replace("\\x", "x")
        .replace("\n", " ")
        .trim();
  }
}
/**
 * Returns parameters of an object
 *
 * @param {Element} element XML Element representing the object
 * @returns {Array} List of parameters with types and documentation
 */
function getParameters(element: Element) {
  const params = new Array<Parameter>();

  for (let node of element.childNodes()) {
    if (node.name() == "parameters") {
      for (let param of node.childNodes()) {
        try {
          let paramName = "";
          if (param.name() != "instance-parameter")
            paramName = param.attr("name").value();

          let type = getParameterType(param);
          let doc = getParameterDoc(param)
            .replace("\n", " ")
            .trim();

          if (isReserved(paramName)) paramName = "_" + paramName;

          if (paramName == "...") {
            paramName = "...other";
          }

          if (params.filter(val => val.name == paramName).length == 0) {
            params.push({ name: paramName, type: type, doc: doc });
          }
        } catch {
          continue;
        }
      }
    }
  }

  return params;
}

function getReturnType(element: Element): ReturnType {
  for (let node of element.childNodes()) {
    if (node.name() == "return-value") {
      let doc = getDocstring(node).replace("\n", " ");
      for (let subnode of node.childNodes()) {
        if (subnode.name() == "type")
          return {
            doc: doc,
            type: getTSType(subnode.attr("name").value())
          };
      }
    }
  }

  return {
    doc: null,
    type: "null"
  };
}

/**
 * Builds a type definition representation of a function
 * 
 * @param {string} name Name of the function
 * @param {Parameter[]} args Arguments composing the function
 * @param {string} returntype Type of the returned value. `null` or `void` if none.
 * @param {number} depth Indentation depth
 * @param {string} [docstring] Function documentation
 * @returns 
 */
function buildFunctionString(
  name: string,
  args: Parameter[],
  returntype: string,
  depth: number,
  docstring?: string
) {
  if (isReserved(name)) {
    name = "_" + name;
  }
  let arglist = args.map(arg => `${arg.name}: ${arg.type}`).join(", ");
  if (returntype == "null") {
    returntype = "void";
  }
  if (options.documentation) {
    let paramDoc = args.map(arg => ` * @param {${arg.type}} ${arg.doc}`);
    let content = docstring.split('\n').map(line => ` * ${line}`);
    content.unshift("/**");
    content.push(...paramDoc, " */");
    content.push(`${name}(${arglist}): ${returntype};`);
    content = indent(content, depth);

    return content.join('\n');
  }

  return `${name}(${arglist}): ${returntype}`;
}

function buildEnumString(element: Element) {
  let enumName = element.attr('name').value();
  let docstring = getDocstring(element);
  let enumContent = docstring.split('\n').map(line => ` * ${line}`);
  enumContent.unshift('/**');
  enumContent.push(' */');
  enumContent.push(`export enum ${enumName} {`);

  let members = element.find(`{${XMLNS}}member`);
  for(let member of members) {
    enumName = member.attr('name').value();
    if(enumName.length == 0 || enumName[0].match('[0-9]'))
      enumName = '_' + enumName;
    
    let enumValue = member.attr('value').value().replace('\\', '\\\\');
    enumContent.push(`    ${enumName.toUpperCase()} = '${enumValue}'`);    
  }
  enumContent.push('}');

  return enumContent.join('\n');
}