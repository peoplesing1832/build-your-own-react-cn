/**
 * 创建文本节点的虚拟DOM
 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

/**
 * 创建虚拟DOM
 */
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    },
  }
}

/**
 * 创建DOM
 */
function createDom(fiber) {
  const dom = fiber.type == "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(element.type)

  const isProperty = key => key !== "children"

  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })
  return dom
}

let nextUnitOfWork = null
let wipRoot = null

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  domParent.appendChild(fiber.dom)
  // 递归子节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitRoot() {
  commitWork(wipRoot.child)
  wipRoot = null
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
​
  const elements = fiber.props.children

  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index]
​
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber, // 父节点的引用
      dom: null,
    }

    if (index === 0) {
      // 父Fiber节点添加child字段，child指向了第一个子节点
      fiber.child = newFiber
    } else {
      // 同级的Fiber节点添加sibling字段
      prevSibling.sibling = newFiber
    }
​
    prevSibling = newFiber
    index++
  }

  // 首先尝试子节点
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    // 尝试同级节点
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

/**
 * 工作循环
 */
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  // 如果nextUnitOfWork为假, 说明所有的工作都已经做完了, 我们需要进入commit阶段
  if (!nextUnitOfWork && wipRoot) {
    // 添加dom
    commitRoot()
  }
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  }
  nextUnitOfWork = wipRoot
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)
