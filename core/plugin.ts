import express = require('express');
import Future = require('sfuture');
import libpath = require('path');
import Response = require('./http/response');
import Request = require('./http/request');


let plugins: {[name: string]: Plugin} = {};

class Plugin implements IPlugin {
  name: string;
  handler: (req: Request) => Future<Response>;
  private path: string;

  constructor(name: string, path: string) {
    this.name = name;
    this.path = libpath.join(path, './main');

    this.handler = (<any>require(this.path)).handle;
  }

  handle(req: express.Request, res: express.Response) {
    this.handler(new Request(req))
      .onSuccess(function (result: Response) {
        res
        .set('Content-Type', result.contentType)
        .status(result.statusCode)
        .send(result.body);
      })
      .onFailure(function (err: Error) {
        res.status(404).send(err.message);
      });
  }
}

const noPlugin: IPlugin = {
  handle(req: express.Request, res: express.Response) {
    res.status(404).send(`No plugin named ${req.params.name}.`);
  }
};

export function get(name: string) {
  let plugin = plugins[name];
  return plugin ? plugin : noPlugin;
}

export function initialize(config: { paths: any }) {
  let pluginPaths: Dict<string> = config.paths;
  Object.keys(pluginPaths).forEach(function (name) {
    let path = pluginPaths[name];
    plugins[name] = new Plugin(name, path);
  });
}
