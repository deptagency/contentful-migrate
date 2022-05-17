export const removeNullValues = (value: any): any => {
  if (value instanceof Array) {
    return value.map(removeNullValues)
  } else if (value instanceof Object) {
    const prunedObject: any = {}
    Object.keys(value).forEach((key) => {
      if (value[key] === null || value[key] === undefined) {
        return
      }
      prunedObject[key] = removeNullValues(value[key])
    })
    return prunedObject
  }
  return value
}

export const createProp = ([key, value]: [string, any]) => `
  .${key}(${JSON.stringify(removeNullValues(value))})`

export const rejectEmptyObjects = ([, value]: [string, any]) => {
  const emptyArray = value.constructor === Array && value.length === 0
  const emptyObject = typeof value === 'object' && Object.keys(value).length === 0
  return value && !emptyArray && !emptyObject
}

export const createField = (itemId: string, field: any) => `
  ${itemId}.createField("${field.id}")${''.concat(...Object.entries(field.props).filter(rejectEmptyObjects).map(createProp))};
`
export const createChangeFieldControl = (itemId: string, field: any) => {
  const { fieldId, widgetId, settings } = field
  const baseString = `${itemId}.changeFieldControl("${fieldId}", "builtin", "${widgetId}"`
  return settings ? `${baseString}, ${JSON.stringify(settings)});` : `${baseString});`
}
export const createContentType = (item: any, editorInterface: any) => `
  const ${item.id} = migration.createContentType('${item.id}')${''.concat(...Object.entries(item.props).map(createProp))};
  ${''.concat(...item.fields.map((field: any) => createField(item.id, field)))}
  ${editorInterface.map((field: any) => createChangeFieldControl(item.id, field)).join('\n')}
`
export const createScript = (item: any, editorInterface: any) => `module.exports.description = "Create content model for ${item.props.name}";

module.exports.up = (migration) => {${createContentType(item, editorInterface)}};

module.exports.down = migration => migration.deleteContentType("${item.id}");
`

export const restructureFields = (field: any) => {
  const { id, ...props } = field
  return { id, props }
}
export const restructureContentTypeJson = (item: any) => ({
  id: item.sys.id,
  props: {
    name: item.name,
    displayField: item.displayField,
    description: item.description
  },
  fields: item.fields.map(restructureFields)
})
export const jsonToScript = (contentTypeJson: any, editorInterface: any) => {
  const restructuredJson = restructureContentTypeJson(contentTypeJson)
  const unformattedScript = createScript(restructuredJson, editorInterface)
  // const engine = new eslint.CLIEngine({
  //   fix: true,
  //   baseConfig: { extends: ['eslint-config-standard'] },
  //   useEslintrc: false
  // })
  // return engine.executeOnText(unformattedScript).results[0].output
  return unformattedScript
}
