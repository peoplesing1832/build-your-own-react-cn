// 判断props是否是on开头
const isEvent = key => key.startsWith("on")
// 用于排除children属性，和on开头的属性
const isProperty = key => key !== "children" && !isEvent(key)
// 用于判断是否更新了属性
const isNew = (prev, next) => key => prev[key] !== next[key]
// 用于判断在新的props上是否有属性
const isGone = (prev, next) => key => !(key in next)

// 下一个需要工作的Fiber节点的引用
let nextUnitOfWork = null
// 正在工作的Fiber树，（类似，workInProgress tree，current tree的根节点在其alternate属性上
let wipRoot = null
// 当前页面的Fiber的树（类似与current tree）
let currentRoot = null
// 需要删除的节点数组
let deletions = null

// 当前正在工作的Fiber
let wipFiber = null
// 当前Fiber的hooks的索引
let hookIndex = null

/**
 * 创建文本节点虚拟DOM
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
export function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  }
}

/**
 * 更新DOM
 */
function updateDom(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        // 如果事件处理程序发生了更新，获取新的props上没有
        // 需要先删除之前的处理程序
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    })
  // 删除之前的属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })
  // 添加或者更新属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })
  // 添加事件监听
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.addEventListener(
        eventType,
        nextProps[name]
      )
    })
}

/**
 * 创建DOM
 */
function createDom(fiber) {
  const dom = fiber.type == "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(element.type)

  // 为创建的DOM, 添加属性
  updateDom(dom, {}, fiber.props)
  return dom
}

/**
 * 删除节点
 */
function commitDeletion (fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

/**
 * 开始处理commit阶段
 */
function commitRoot() {
  // 开始处理工作,先处理删除节点的任务
  deletions.forEach(commitWork)
  // 开始处理工作,处理更新和添加的工作
  commitWork(wipRoot.child)
  // 将新的Fiber设置为老的Fiber树
  currentRoot = wipRoot
  wipRoot = null
}

/**
 * commit阶段的工作
 */
function commitWork(fiber) {
  if (!fiber) {
    return
  }
  // 父级Fiber
  let domParentFiber = fiber.parent
  // 直到找到含有dom的Fiber节点
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom


  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    // 处理新增
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "DELETION") {
    // 处理删除
    commitDeletion(fiber, domParent)
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    // 处理更新
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  }
  // 递归处理子节点
  commitWork(fiber.child)
  // 递归处理兄弟节点
  commitWork(fiber.sibling)
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
      wipFiber.child = newFiber
    } else if (element) {
      // 同级的Fiber节点添加sibling字段
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

/**
 * 处理type为DOM的Fiber
 */
function updateHostComponent (fiber) {
  if (!fiber.dom) {
    // 创建dom节点
    fiber.dom = createDom(fiber)
  }
  // 子元素
  const elements = fiber.props.children
  reconcileChildren(wipFiber, elements)
}

/**
 * 处理type为函数的Fiber
 */
function updateFunctionComponent (fiber) {
  // 设置正在工作的Fiber
  wipFiber = fiber
  // 当前hooks的索引默认为0
  hookIndex = 0
  // hooks的集合
  wipFiber.hooks = []
  // 获取Function组件的children
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

/**
 * 处理工作单元（render阶段）
 */
function performUnitOfWork(fiber) {
  // 判断是不是函数组件
  const isFunctionComponent =
    fiber.type instanceof Function

  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }
  // 接下来返回下一个需要处理的Fiber节点，因为是深度优先遍历，优先从子节点开始
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

export function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]
  // 判断之前是否有状态
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [], // 更新队列
  }
  const actions = oldHook ? oldHook.queue : []
  actions.forEach(action => {
    hook.state = action(hook.state)
  })
  const setState = (action) => {
    // action添加到队列中
    hook.queue.push(action)
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    // 当nextUnitOfWork不为空时，就会进入渲染阶段
    nextUnitOfWork = wipRoot
    deletions = []
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
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
    // 开始进入commit阶段，commit阶段不是异步的，所以不会判断timeRemaining
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

export function render(element, container) {
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

requestIdleCallback(workLoop)
