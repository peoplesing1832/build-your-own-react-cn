# Build your own React

![封面.png](https://i.loli.net/2021/02/23/E8JGzAvknSIDuxY.png)

Build your own React 的学习笔记

## demo

## 前言

重写React, 遵循React代码中的架构, 但是没有进行优化。基于React16.8, 使用hook并删除了所有与类相关的代码。

## 零: review

首先回顾一些React的概念，下面是一个简单的React应用程序。一共三行代码，第一行定义了一个React元素, 第二行获取了DOM节点, 最后一行将React元素渲染到容器中。

```js
const element = <h1 title="foo">Hello</h1>
const container = document.getElementById("root")
ReactDOM.render(element, container)
```


第一行中，我们使用了JSX, JSX不是有效的JavaScript，我们使用原生js替换它。通常通过Babel等构建工具，JSX转换为JS。使用`createElement`替换JSX标记，并将标签名，props，子级作为参数。

```js
const element = React.createElement(
  "h1",
  { title: "foo" },
  "Hello"
);
```

`React.createElement`, 会根据参数创建一个对象。除了一些验证外，这就是`React.createElement`所做的全部。我们可以直接`React.createElement`函数替换成它的输出。

```js
const element = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
}
```

一个普通的JavaScript对象, 主要有两个属性`type`和`props`。`type`属性是一个字符串，表示我们创建的DOM节点的类型。它也可以是一个函数，但是我们留在后面说。`props`是一个对象, `props`中有一个特殊的属性`children`。在当前的情况`children`是字符串，但是通常情况下它是包含更多元素的数组。接下来我们需要替换`ReactDOM.render`。

首先使用`type`属性，创建一个节点。我们将`element`的所有`props`分配给该节点，目前只有`title`属性。然后我们为子节点创建节点。我们的`children`是一个字符串，因此我们创建一个文本节点。

> 为什么使用`createTextNode`而不是`innerText`呢？因为在之后都会以相同的方式处理所有元素。

最后将textNode添加到h1中，h1添加到container中。

```js
const element = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
}
​const container = document.getElementById("root")

const node = document.createElement(element.type)
node["title"] = element.props.title
const text = document.createTextNode("")
text["nodeValue"] = element.props.children
node.appendChild(text)
container.appendChild(node)
```

目前我们拥有了和之前一样的程序，但是没有使用React。
## 一: createElement

我们从一个新的程序开始，这次我们使用自己的React替换原来的React代码。

```js
const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
)
const container = document.getElementById("root")
ReactDOM.render(element, container)
```

我们从编写自己的`createElement`开始。

```js
const element = createElement(
  "div",
  { id: "foo" },
  createElement("a", null, "bar"),
  createElement("b")
)
const container = document.getElementById("root")
render(element, container)
```

`createElement`需要做的就是创建一个`type`和`props`的对象。`createElement`函数中, `children`参数使用`rest`运算符, `children`始终就会为数组。

```js
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children,
    },
  }
};
```

例如, `createElement("div", null, a, b)`会返回：

```js
{
  "type": "div",
  "props": { "children": [a, b] }
}
```

目前`children`数组中会包含原始值，比如字符串和数字。我们需要对它们进行包装。我们创建一个特殊的类型`TEXT_ELEMENT`。

在React源码中，不会包装原始值, 或者在没有子级的情况下创建空的数组。我们这样做的目的是为了简化我们的代码.

```js
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

function createElement(type, props, ...children) {
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
```

我们如何让`Babel`在编译的过程中，使用我们自己创建的`createElement`呢？我们在配置`babel`的`@babel/preset-react`插件时自定义[`pragma`参数](https://babeljs.io/docs/en/babel-preset-react#pragma)
## 二: render

接下来我们需要编写自己的`ReactDOM.render`。

> 目前我们只关心向DOM中添加内容，稍后处理更新和删除

我们首先使用元素的类型创建`DOM`节点，然后将新节点添加到容器中

```js
function render(element, container) {
  const dom = document.createElement(element.type)
  container.appendChild(dom)
}
```

我们需要递归的为每一个`children`元素做相同的事情

```js
function render(element, container) {
  const dom = document.createElement(element.type)
  element.props.children.forEach(child =>
    render(child, dom)
  )
  container.appendChild(dom)
}
```

之前添加了文本元素的节点，所以在创建节点时需要判断元素的类型

```js
function render(element, container) {
  const dom =
    element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type)

  element.props.children.forEach(child =>
    render(child, dom)
  )
  container.appendChild(dom)
}
```

最后我们需要将元素的props添加到节点的属性上

```js
function render(element, container) {
  const dom =
    element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type)

  const isProperty = key => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  element.props.children.forEach(child =>
    render(child, dom)
  )
  container.appendChild(dom)
}
```

目前为止，我们已经有了一个将JSX呈现到DOM的库。
## 三: 并发模式

在这之前，我们需要重构代码。

递归渲染存在问题，一旦开始渲染就无法停止，直到我们渲染完成整个树。如果树很大，会阻塞主线程过长的时间。

> 🤓️: React Fiber架构使用了链表树实现了可中断渲染，如果大家有兴趣可以参考[这篇文章](https://juejin.cn/post/6925665796106485767)

因此我们需要把工作分解成几个小单元，在我们完成每个单元后，有重要的事情要做，我们中断渲染。

我们使用`requestIdleCallback`实现循环, 浏览器会在空闲时，执行`requestIdleCallback`的回调。**React的内部并不使用`requestIdleCallback`, React内部使用[scheduler package](https://github.com/facebook/react/tree/master/packages/scheduler)**, 通过`requestIdleCallback`我们还可以获得我们还有多少可用时间用于渲染。

> 🤓️: 关于requestIdleCallback的更多细节可以查看这篇文章，[详解 requestIdleCallback](https://juejin.cn/post/6844904081463443463)

```js
let nextUnitOfWork = null
​
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}
​
requestIdleCallback(workLoop)
​
function performUnitOfWork(nextUnitOfWork) {
  // TODO
}
```

> 🤓️: nextUnitOfWork变量保持了Fiber中需要工作节点引用或者为null, 如果是null表示没有工作。

要开始我们的`workLoop`, 我们需要第一个工作单元（Fiber节点），然后编写`performUnitOfWork`函数，`performUnitOfWork`函数执行工作，并返回下一个需要工作的节点。

## 四: Fibers

我们需要一个数据结构Fiber树（链表树）。每一个元素都有对应的Fiber节点, 每一个Fiber是一个工作单元。

假设我们需要渲染这样的一颗树：

```js
render(
  <div>
    <h1>
      <p />
      <a />
    </h1>
    <h2 />
  </div>,
  container
)
```

在`render`中，创建Fiber，并将根节点的Fiber分配给`nextUnitOfWork`变量。余下的工作在`performUnitOfWork`函数进行，需要做三件事：

1. 将元素添加到DOM
2. 为子节创建Fiber
3. 返回下一个工作单元

![Fiber树.png](https://i.loli.net/2021/02/24/oSn8euy6PABDvCf.png)

Fiber树是一个链表树，每一个Fiber节点有`child`, `parent`, `sibling`属性

- `child`, 第一个子级的引用
- `sibling`, 第一个同级的引用
- `parent`， 父级的引用

> 🤓️: 在React的Fiber节点中，使用`return`字段保留了对父Fiber节点的引用

遍历Fiber树(链表树)时使用了深度优先遍历，说一下遍历的过程：

1. 从根节点root获取第一个子节点
2. 如果root有子节点，将当前指针设置为第一个子节点，并进入下一次迭代。（深度优先遍历）
3. 如果root的第一个子节点，没有子节点，则尝试获取它的第一个兄弟节点。
4. 如果有兄弟节点，将当前指针设置为第一个子节点，然后兄弟节点进入深度优先遍历。
5. 如果没有兄弟节点，则返回根节点root。尝试获取父节点的兄弟节点。
5. 如果父节点没有兄弟节点，则返回根节点root。最后结束遍历。

好，接下来我们开始添加代码, 将创建的DOM的代码单独抽离出, 稍后使用它

```js
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
```

在`render`函数中，将`nextUnitOfWork`变量设置为Fiber节点树的根

```js
function render(element, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  }
}
```

当浏览器准备就绪，调用workLoop，开始处理根节点

```js
let nextUnitOfWork = null
​
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}
​
requestIdleCallback(workLoop)
​
function performUnitOfWork(fiber) {
  // 添加DOM节点
  // 创建Fiber
  // 获取下一个处理工作的Fiber节点
}
```

首先创建DOM, 并添加到Fiber节点的`dom`字段中，我们在`dom`字段中保留对`dom`的引用

```js
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
​
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }
}
```

> 🤓️: 在React的Fiber节点中，`stateNode`字段，保留对class组件实例的引用, DOM节点或其他与Fiber节点相关联的React元素类实例的引用。

接下来为每一个子元素创建Fiber节点。同时因为Fiber树是一个链表树，所以我们需要为Fiber节点添加`child`, `parent`, `sibling`字段

```js
function performUnitOfWork(nextUnitOfWork) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
​
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

  const elements = fiber.props.children

  let index = 0
  let prevSibling = null

  while (index < elements.length) {
    const element = elements[index]
​
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber, // 父Fiber节点的引用
      dom: null,
    }

    if (index === 0) {
      // 父Fiber节点添加child字段
      fiber.child = newFiber
    } else {
      // 同级的Fiber节点添加sibling字段
      prevSibling.sibling = newFiber
    }
​
    prevSibling = newFiber
    index++
  }
}
```

在完成的当前节点的工作后，我们需要返回下一个节点。因为是深度优先遍历，首先尝试遍历`child`，然后是`sibling`, 最后回溯到`parent`, 尝试遍历`parent`的`sibling`

```js
function performUnitOfWork(nextUnitOfWork) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
​
  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }

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
      // 父Fiber节点添加child字段
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
```

## 五: render 和 commit

目前存在的问题，在遍历Fiber树的时候，我们目前会在这里向DOM中添加新节点，由于我们使用`requestIdleCallback`, 浏览器可能会中断我们的渲染，用户会看到不完整的UI。这违反了一致性的原则。

> 🤓️: React的核心原则之一是"一致性", 它总是一次性更新DOM, 不会显示部分结果。

> 🤓️: 在React的源码中, React分为两个阶段执行工作, `render`阶段和`commit`阶段。`render`阶段的工作是可以异步执行的，React根据可用时间处理一个或者多个Fiber节点。当发生一些更重要的事情时，React会停止并保存已完成的工作。等重要的事情处理完成后，React从中断处继续完成工作。但是有时可能会放弃已经完成的工作，从顶层重新开始。此阶段执行的工作是对用户是不可见的，因此可以实现暂停。但是在`commit`阶段始终是同步的它会产生用户可见的变化, 例如DOM的修改. 这就是React需要一次性完成它们的原因。


我们需要删除`performUnitOfWork`函数中更改DOM的代码。

```js
function performUnitOfWork(nextUnitOfWork) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }

  const elements = fiber.props.children

  // ...
```

我们需要保留Fiber树根的引用, 我们称其为正在工作的root或`wipRoot`。

> 🤓️: 在React中Fiber树的根被称为`HostRoot`。我们可以在通过容器的DOM节点获取, `容器DOM._reactRootContainer._internalRoot.current`。

> 🤓️: `wipRoot`类似React源码中`workInProgress tree`的根节点，在React应用程序中，我们可以通过`容器DOM._reactRootContainer._internalRoot.current.alternate`, 获取`workInProgress tree`的根节点。

```js
let wipRoot = null

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
  }
  nextUnitOfWork = wipRoot
}
```

完成了所有的工作。我们需要把整个Fiber树更新到DOM上。我们需要在`commitRoot`函数中完成这个功能。

```js
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
```

> 🤓️: 在React的源码中`commit`阶段从`completeRoot`函数开始，在开始任何工作前，它将`FiberRoot`的`finishedWork`属性设置为null。

## 六: 协调

目前为止，我们仅仅向DOM中添加了内容，但是更新和删除呢？我们需要将render函数接收到元素和提交到DOM上的最后的Fiber树进行对比。

因此在`commit`我们需要保存最后的Fiber树的引用，我们称之为`currentRoot`。我们还将`alternate`字段添加到每一个Fiber节点上，`alternate`字段上保存了`currentRoot`的引用。

> 🤓️: 在React源码中，在第一次渲染完成后，React会生成一个Fiber树。该树映射了应用程序的状态，这颗树被称为`current tree`。当应用程序开始更新时，React会构建一个`workInProgress tree`, `workInProgress tree`映射了未来的状态。

> 🤓️: 所有的工作都是在`workInProgress tree`上的Fiber上进行的。当React开始遍历Fiber时，它会为每一个现有的Fiber节点创建一个备份, 在`alternate`字段中，备份构成了`workInProgress tree`。

```js
let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null

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
  // 保存最近一次输出到页面上的Fiber树
  currentRoot = wipRoot
  wipRoot = null
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  }
  nextUnitOfWork = wipRoot
}
```

接下来我们需要从`performUnitOfWork`函数中将创建Fiber的代码提取出来，一个新的`reconcileChildren`函数。在这里我们将对`currentRoot`(当前页面对应的Fiber树)与新元素进行协调。

```js
function reconcileChildren(wipFiber, elements) {
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
      wipFiber.child = newFiber
    } else {
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
  reconcileChildren(wipFiber, elements)

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
```

我们同时遍历旧的Fiber树，既`wipFiber.alternate`，和需要协调的新的元素。如果我们忽略遍历链表和数组的模版代码。那么在`while`循环中，最重要的就是`oldFiber`和`element`。`element`是我们需要渲染的DOM, `oldFiber`是上次渲染的Fiber。我们需要比较它们，以确定DOM是否需要任何的更改。

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (
    index < elements.length ||
    oldFiber !== null
  ) {
    const element = elements[index]
​    let newFiber = null

    // TODO compare oldFiber to element

    // ....

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      // 父Fiber节点添加child字段，child指向了第一个子节点
      wipFiber.child = newFiber
    } else {
      // 同级的Fiber节点添加sibling字段
      prevSibling.sibling = newFiber
    }
​
    prevSibling = newFiber
    index++
  }
}
```

为了比较它们我们使用以下的规则：

1. 如果`oldFiber`和`element`具有相同的类型，我们保留DOM节点，并使用新的props更新
2. 如果类型不同，并且有新元素。我们需要创建一个新的DOM节点。
3. 如果类型不同，存在之前的Fiber，我们需要移除旧节点

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0
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
      // 更新节点
    }

    if (!sameType && element) {
      // 新增节点
    }

    if (!sameType && oldFiber) {
      // 删除节点
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      // 父Fiber节点添加child字段，child指向了第一个子节点
      wipFiber.child = newFiber
    } else {
      // 同级的Fiber节点添加sibling字段
      prevSibling.sibling = newFiber
    }
​
    prevSibling = newFiber
    index++
  }
}
```

在React中，React使用了`key`, 可以更好的进行协调，使用`key`可以检测元素在列表中位置是否改变，更好的复用节点。

当之前的Fiber和新元素具有相同的类型时，我们创建一个新的Fiber节点，保留旧Fiber的DOM节点和元素的props。

并且为Fiber添加了一个新的属性`effectTag`, 稍后在`commit`阶段使用

> 🤓️: 在React源码中`effectTag`, `effectTag`编码的是与Fiber节点相关的`effects`(副作用)。React中`effectTag`使用了数字的形式存储，使用了按位或构造了一个属性集。更多内容请[查看](https://juejin.cn/post/6931187032857575438)

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0
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
      // 新增节点
    }

    if (!sameType && oldFiber) {
      // 删除节点
    }

    // ...
  }
}
```

对于新增的节点，我们在`effectTag`属性上，使用`PLACEMENT`标志进行标记。

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0
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

    // ...

    if (!sameType && element) {
      // 新增节点
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
      // 删除节点
    }

    // ...
  }
}
```

对于需要删除节点，我们不创建新的Fiber，而是将`effectTag`设置为`DELETION`, 并添加到旧的Fiber节点上。

```js
function reconcileChildren(wipFiber, elements) {
  let index = 0
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

    // ...

    if (!sameType && oldFiber) {
      // 删除节点
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    // ...
  }
}
```

当我们在`commit`时, 我们从新构建的Fiber节点树开始遍历，由于没有需要保存删除的旧节点。所以我们需要额外使用一个数组`deletions`保存需要删除的旧节点

> 🤓️: 在React的源码，`workInProgress tree`的Fiber节点拥有`current tree`对应节点的引用。反之亦然。

> 🤓️: 在React的源码中，会把所有需要在`commit`阶段，执行副作用的Fiber节点，构建为线性列表，以方便快速迭代。迭代线性列表要比迭代树快的多，因为不需要迭代没有side-effects的节点。

```js
let deletions = null

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
```

当我们进入`commit`阶段时，使用该数组中的Fiber

```js
function commitRoot() {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}
```

现在让我修改`commitWork`函数以处理新的`effectTag`字段

如果`effectTag`是`PLACEMENT`, 与之前一样，将DOM添加添加到父节点上

```js
function commitWork(fiber) {
  if (!fiber) {
    return
  }
  const domParent = fiber.parent.dom
  // 对于新增节点的处理
  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null
  ) {
    domParent.appendChild(fiber.dom)
  }
  // 递归处理子节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
```

如果`effectTag`是`DELETION`, 我们从父节点上删除节点

```js
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
  }
  // 递归处理子节点
  commitWork(fiber.child)
  commitWork(fiber.sibling)
}
```

如果`effectTag`是`UPDATE`, 我们使用新的`props`更新现在的DOM

```js
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
```

接下来需要实现`updateDom`函数

```js
function updateDom(dom, prevProps, nextProps) {
  // TODO
}
```

我们使用旧的Fiber的props和新的Fiber的props进行比较，移除删除的的props，添加或更新已更改的props

```js
// 用于排除children属性
const isProperty = key => key !== "children"
// 用于判断是否更新了属性
const isNew = (prev, next) => key => prev[key] !== next[key]
// 用于判断在新的props上是否有属性
const isGone = (prev, next) => key => !(key in next)

function updateDom(dom, prevProps, nextProps) {
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
}
```

我们需要对事件监听器做特殊的处理，如果props以`on`开头, 我们使用不同的方式去处理它们

```js
// 判断props是否是on开头
const isEvent = key => key.startsWith("on")
// 用于排除children属性，和on开头的属性
const isProperty = key => key !== "children" && !isEvent(key)
```

如果事件处理程序发生了更改，我们需要首先删除，然后添加新的处理程序

> 🤓️: 直接在DOM上添加事件处理程序的方式，有点类似`preact`中的处理方式

```js
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
```
## 七: Function 组件

我们需要添加的下一件事是对Function组件的支持。我们修改下我们的例子。

```js
function App(props) {
  return <h1>Hi {props.name}</h1>
}
const element = <App name="foo" />
const container = document.getElementById("root")
render(element, container)
```

我们将jsx转换为js

```js
function App(props) {
  return createElement(
    "h1",
    null,
    "Hi ",
    props.name
  )
}
const element = createElement(App, {
  name: "foo",
})
```

Function组件和DOM主要有两个不同

1. Function组件的Fiber没有DOM节点
2. children来自Function, 而不是直接从DOM中直接获取

我们检查Fiber的类型是否为函数，并根据类型由不同的函数进行处理，如果是不同的DOM，传入`updateHostComponent`

```js
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
```

`updateHostComponent`和我们之前做的一样

```js
function updateHostComponent () {
  if (!fiber.dom) {
    // 创建dom节点
    fiber.dom = createDom(fiber)
  }
​ // 子元素
  const elements = fiber.props.children
  // 子元素与旧的Fiber进行子协调
  reconcileChildren(wipFiber, elements)
}
```

`updateFunctionComponent`运行函数组件获取`children`。在我们的例子中App会返回h1元素。一旦有了`children`, 协调就可以按照之前的方式进行了。不需要进行任何修改。

```js
function updateFunctionComponent () {
  // 获取Function组件的children
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}
```

下面我们需要修改`commitWork`函数。因为我们的Function组件的Fiber节点没有DOM节点。我们需要修改两件事。


首先如果要找到DOM节点的父节点，我们需要依次向上查找，找到带有DOM节点的Fiber

```js

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

  // ...
}
```

在删除节点时，我们需要向下直到找到含有DOM节点的Fiber

```js
function commitDeletion (fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

function commitWork(fiber) {
  // ...

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
  // ...
}
```

## 八: hooks

最后一步。目前我们有了Function组件，现在让我们添加状态。下面是一个计数器的例子

```js
function Counter() {
  const [state, setState] = Didact.useState(1)
  return (
    <h1 onClick={() => setState(c => c + 1)}>
      Count: {state}
    </h1>
  )
}
const element = <Counter />
onst container = document.getElementById("root")
render(element, container)
```

我们使用`useState`获取和更新计数器的值。在调用函数组件前，我们需要初始化一些全局变量，以便在`useState`函数中使用它们。

首先获取正在工作的Fiber，我们在Fiber节点中添加`hooks`数组，使用数组的目的是为了支持多个`useState`。并且引用当前`hooks`的索引。

```js
// 当前正在工作的Fiber
let wipFiber = null
// 当前Fiber的hooks的索引
let hookIndex = null

function updateFunctionComponent () {
  // 正在工作的Fiber
  wipFiber = fiber
  // 当前hooks的索引默认为0
  hookIndex = 0
  // hooks的集合
  wipFiber.hooks = []
  // 获取Function组件的children
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}
```

当组件调用`useState`时，首先我们检查是否之前是否有hook，如果存在旧的hook把之前的状态复制到新hook。否则，使用初始值初始化hook。

然后将hook添加到Fiber，并将hook的索引加1

```js
function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]
  // 判断之前是否有状态
  const hook = {
    state: oldHook ? oldHook.state : initial,
  }
  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state]
}
```

`useState`还应该返回一个函数，更新状态。因此我们定义`setState`用于接收`action`, 用于更新状态。`setState`会将`action`推入到`hook`的队列上。

然后我们执行与`render`函数中类似的操作，我们设置`nextUnitOfWork`开始进行新的渲染阶段。

```js
function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]
  // 判断之前是否有状态
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [], // 更新队列
  }
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
```

> 🤓️: 这里简化了setState, setState只接收函数作为参数。

但是目前我们还没有更新`state`。在下次渲染组件时，我们从旧的队列中获取所有`action`。然后将它们逐一应用到新的hook state上。当我们返回状态时，state会被更新。

> 🤓️: 调用setState，不会立刻更新state。而是在进入`render`阶段后更新state，然后`useState`会返回新的状态。

```js
function useState(initial) {
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
```

我们已经建立了好了自己的React。

## 结语

除了帮助你理解react是工作原理外，本文的另一个目的是让你在后续能够更轻松深入React。所以我们多次使用了和react源码中一样的函数名以及变量名。

我们省略了很多了React的优化

- 在`render`阶段遍历整棵树，但是React中会跳过没有任何更改的子树。
- `commit`阶段，React会进行线性遍历
- 目前我们会每次都创建一个新的Fiber，而React中会复用之前的Fiber节点

还有很多...

我们还可以继续添加功能，比如：

1. 添加key
2. 添加useEffect
3. 使用对象作为样式的props
4. children扁平化

## 参考

- [Build your own React(基于hooks实现)](https://pomb.us/build-your-own-react/)
- [Didact: a DIY guide to build your own React(基于class实现)](https://engineering.hexacta.com/didact-learning-how-react-works-by-building-it-from-scratch-51007984e5c5)
- [didact](https://github.com/pomber/didact)
