import { parseXml, Element } from "libxmljs";
import { isNameValid, indent } from './utils';
import './extensions';

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

interface GIRClass {
  name: string;
  parents: string[];
  contents: string;
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

          if (isNameValid(paramName)) paramName = "_" + paramName;

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
/**
 * Returns the return type of the object
 * 
 * @param {Element} element XML Element rpresenting the object
 * @returns {ReturnType} Return type of the object
 */
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
 * @param {ReturnType} returntype Type of the returned value. `null` or `void` if none.
 * @param {number} depth Indentation depth
 * @param {string} [docstring] Function documentation
 * @param {string[]} [extraTags] Extra tags to pass to the function declaration
 * @returns 
 */
function buildFunctionString(
  name: string,
  args: Parameter[],
  returntype: ReturnType,
  depth: number,
  docstring?: string,
  extraTags?: string[]
) {
  if (isNameValid(name)) {
    name = "_" + name;
  }
  let arglist = args.map(arg => `${arg.name}: ${arg.type}`).join(", ");
  if (returntype.type == "null") {
    returntype.type = "void";
  }
  if (options.documentation) {
    let paramDoc = args.map(arg => ` * @param {${arg.type}} ${arg.doc}`);
    paramDoc.push(` * @returns {${returntype.type}} ${returntype.doc}`);
    let content = docstring.split('\n').map(line => ` * ${line}`);
    content.unshift("/**");
    content.push(...paramDoc, " */");
    content.push(`${name}(${arglist}): ${returntype};`);
    content = indent(content, depth);

    return content.join('\n');
  }
  if(extraTags)
    return `${extraTags.join(' ')} ${name}(${arglist}): ${returntype.type}`;
  else
    return `${name}(${arglist}): ${returntype.type}`;
}
/**
 * Builds a type definition string of an enum.
 * 
 * @param {Element} element 
 * @returns {string} String representation of the enum
 */
function buildEnumString(element: Element): string {
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
/**
 * Extract methods from class
 * 
 * @param {Element} classTag XML element representing the class.
 * @returns {string[]} String type definition representation of the methods.
 */
function extractMethods(classTag: Element): string[] {
  let methodsContent = new Array<string>();
  for(let node of classTag.childNodes()) {
    if(['method', 'virtual-method'].indexOf(node.name()) != -1) {
      let methodName = node.attr('name').value();
      let docstring = getDocstring(node);
      let params = getParameters(node);
      let returntype = getReturnType(node);

      methodsContent.push(buildFunctionString(methodName, params, returntype, 1, docstring));
    }
  }

  return methodsContent;
}

/**
 * Builds type definition string representation of class constructor(s).
 * 
 * @param {Element} classTag XML Element representing the class
 * @returns {string[]} String representation of the constructors.
 */
function extractConstructors(classTag: Element): string[] {
  let className = classTag.attr('name').value();
  let methodsContent = new Array<string>();
  for(let node of classTag.childNodes()) {
    if(node.name() == "constructor") {
      let methodName = node.attr('name').value();
      let docstring = getDocstring(node);
      let params = getParameters(node);
      let returnType: ReturnType = {
        doc: `Instance of ${methodName}.`,
        type: methodName
      };

      if(methodName = "new") {
        methodsContent.push(buildFunctionString("constructor", params, returnType, 1, docstring));
      }

      // Also include a static function that does the same thing as the class constructor
      methodsContent.push(buildFunctionString(methodName, params, returnType, 1, docstring, ['static']));
    }
  }

  return methodsContent;
}

/**
 * Builds classes, sort them by hyerarchy and returns necessary imports
 * 
 * @param {GIRClass[]} classes List of classes to build.
 * @returns {[string, Set<string>]} String representation of the class and list of imports
 */
function buildClass(classes: GIRClass[]): [string, Set<string>] {
  let classesText = "";
  let imports = new Set<string>();
  let parents = new Array<string>();
  let localParents = new Set<string>();
  let writtenClasses = new Set<string>();
  let allClasses = new Set(classes.map(klass => klass.name));

  for(let classInfo of classes) {
    parents = classInfo.parents;
    localParents = localParents.union(new Set(parents.filter(classParent => {
      return !classParent.includes('.');
    })));
  }

  while(writtenClasses !== allClasses) {
    for(let klass of classes) {
      let skip = false;
      for(let parent of parents) {
        if(!parent.includes('.') && !writtenClasses.has(parent)) {
          skip = true;
        }
        if(writtenClasses.has(klass.name)) {
          skip = true;
        }
        if(skip) continue;

        classesText += klass.contents;
        writtenClasses.add(klass.name);
        for(let parentClass of parents) {
          if(parentClass.includes('.'))
            imports.add(parentClass.substring(0, parentClass.indexOf('.')));
        }
      }
    }
  }

  return [classesText, imports]
}
/**
 * Builds a representation of the class from the associated XML element.
 * 
 * @param {Element} element XML Element representing the class
 * @returns {GIRClass} Object representing the class, including it's type definition.
 */
function extractClass(element: Element): GIRClass {
  let className = element.attr('name').value();
  let docstring = getDocstring(element);
  let parents = new Array<string>();
  let parentAttr = element.attrs().find((value) => value.name() == "parent");
  if(parentAttr)
    parents.push(parentAttr.value());

  let implementsArg = element.find(`{${XMLNS}}implements`);
  for(let impl of implementsArg)
    parents.push(impl.attr('name').value());

  let classContent = [`export class ${className} {`];
  let docstringLines = docstring.split('\n');
  docstringLines.forEach(value => ` * ${value}`);
  docstringLines.unshift('/**');
  docstringLines.push(' */');

  classContent.unshift(...docstringLines);
  classContent.push(...indent(extractConstructors(element), 1));
  classContent.push(...indent(extractMethods(element), 1));

  return {
    name: className,
    parents: parents,
    contents: classContent.join('\n') + '\n'
  };
}

function extractNamespace(nspace: Element) {
  let namespaceContent = "";
  let classes = new Array<any>();

  for(let element of nspace.childNodes()) {
    let name = element.name();
  }
}