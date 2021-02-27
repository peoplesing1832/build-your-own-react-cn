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
let currentRoot = null
let deletions = null

function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null
  ) {
    // 对于新增节点的处理
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "DELETION") {
    // 对于删除节点的处理
    domParent.removeChild(fiber.dom)
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    // 对于需要更新节点的处理
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  }
  // 递归处理子节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  // 保存最近一次输出到页面上的Fiber树
  currentRoot = wipRoot
  wipRoot = null
}

/**
 * 子协调, 并构建新的Fiber节点，新的Fiber节点的alternate字段引用旧的Fiber节点
 */
function reconcileChildren(wipFiber, elements) {
  let index = 0
  // 从第一个子节点开始
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (
    index < elements.length ||
    oldFiber !== null
  ) {
    const element = elements[index]
    let newFiber = null

    // 判断是否是同类型
    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type

    if (sameType) {
      // 对于更新节点
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }

    if (!sameType && element) {
      // 处理新增节点
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }

    if (!sameType && oldFiber) {
      // 处理删除节点
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    // 下一个旧节点
    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      // 父Fiber节点添加child字段，child指向了第一个子节点
      wipFiber.child = newFiber
    } else if (element) {
      // 同级的Fiber节点添加sibling字段
      prevSibling.sibling = newFiber
    }
​
    prevSibling = newFiber
    index++
  }
}

function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
​
  const elements = fiber.props.children
  // 子协调
  reconcileChildren(wipFiber, elements)

  // 接下来返回下一个需要处理的Fiber节点，因为是深度优先遍历
  // 优先从子节点开始
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
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

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  deletions = []
  nextUnitOfWork = wipRoot
}
