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

我们从编写自己的`createElement`开始。`children`参数使用`rest`运算符, `children`始终就会为数组。

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

例如, `createElement("div", null, a, b)`返回：

```js
{
  "type": "div",
  "props": { "children": [a, b] }
}
```
## 二: render

## 三: 并发模式

## 四: Fiber

## 五: render 和 commit

## 六: 协调

## 七: Function 组件

## 八: hooks

## 参考

- [Build your own React(基于hooks实现)](https://pomb.us/build-your-own-react/)
- [Didact: a DIY guide to build your own React(基于class实现)](https://engineering.hexacta.com/didact-learning-how-react-works-by-building-it-from-scratch-51007984e5c5)
- [didact](https://github.com/pomber/didact)
