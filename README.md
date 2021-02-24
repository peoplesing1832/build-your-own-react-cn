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

目前为止，我们已经有了一个将JSX呈现到DOM的库。👻[在线的例子在这里]()
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

> 🤓️: nextUnitOfWork变量保持了Fiber中需要工作节点引用或者为null, 表示没有工作。

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
- `return`， 父级的引用

遍历Fiber树(链表树)时使用了深度优先遍历，说一下遍历的过程：

1. 从根节点root获取第一个子节点
2. 如果root有子节点，将当前指针设置为第一个子节点，并进入下一次迭代。（深度优先遍历）
3. 如果root的第一个子节点，没有子节点，则尝试获取它的第一个兄弟节点。
4. 如果有兄弟节点，将当前指针设置为第一个子节点，然后兄弟节点进入深度优先遍历。
5. 如果没有兄弟节点，则返回根节点root。尝试获取父节点的兄弟节点。
5. 如果父节点没有兄弟节点，则返回根节点root。最后结束遍历。

好，接下来我们开始添加代码


## 五: render 和 commit

## 六: 协调

## 七: Function 组件

## 八: hooks

## 参考

- [Build your own React(基于hooks实现)](https://pomb.us/build-your-own-react/)
- [Didact: a DIY guide to build your own React(基于class实现)](https://engineering.hexacta.com/didact-learning-how-react-works-by-building-it-from-scratch-51007984e5c5)
- [didact](https://github.com/pomber/didact)
