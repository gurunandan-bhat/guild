(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['pagination'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "disabled";
},"3":function(container,depth0,helpers,partials,data) {
    return "aria-disabled=\"true\" tabindex=\"-1\"";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "data-goto-page=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"prevPage") || (depth0 != null ? lookupProperty(depth0,"prevPage") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"prevPage","hash":{},"data":data,"loc":{"start":{"line":16,"column":59},"end":{"line":16,"column":71}}}) : helper)))
    + "\"";
},"7":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.lambda, alias3=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <li class=\"page-item "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isActive") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":23,"column":37},"end":{"line":23,"column":71}}})) != null ? stack1 : "")
    + "\">\n                        <a\n                        class=\"page-link\"\n                        href=\"#\"\n                        aria-label=\"Page "
    + alias3(alias2((depth0 != null ? lookupProperty(depth0,"label") : depth0), depth0))
    + "\"\n                        role=\"button\"\n                        "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isActive") : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":29,"column":24},"end":{"line":29,"column":71}}})) != null ? stack1 : "")
    + "\n                        "
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(depth0 != null ? lookupProperty(depth0,"isActive") : depth0),{"name":"unless","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":30,"column":24},"end":{"line":30,"column":91}}})) != null ? stack1 : "")
    + ">\n                        "
    + alias3(alias2((depth0 != null ? lookupProperty(depth0,"label") : depth0), depth0))
    + "\n                    </a>\n                </li>\n";
},"8":function(container,depth0,helpers,partials,data) {
    return "active";
},"10":function(container,depth0,helpers,partials,data) {
    return "aria-current=\"page\"";
},"12":function(container,depth0,helpers,partials,data) {
    var lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "data-goto-page=\""
    + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"index") : depth0), depth0))
    + "\"";
},"14":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "data-goto-page=\""
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"nextPage") || (depth0 != null ? lookupProperty(depth0,"nextPage") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"nextPage","hash":{},"data":data,"loc":{"start":{"line":44,"column":58},"end":{"line":44,"column":70}}}) : helper)))
    + "\"";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div class=\"d-flex justify-content-center mt-4\">\n    <div>\n        <p class=\"text-center text-muted mb-2\">\n            Page "
    + alias4(((helper = (helper = lookupProperty(helpers,"currentPage") || (depth0 != null ? lookupProperty(depth0,"currentPage") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"currentPage","hash":{},"data":data,"loc":{"start":{"line":4,"column":17},"end":{"line":4,"column":32}}}) : helper)))
    + " of "
    + alias4(((helper = (helper = lookupProperty(helpers,"totalPages") || (depth0 != null ? lookupProperty(depth0,"totalPages") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"totalPages","hash":{},"data":data,"loc":{"start":{"line":4,"column":36},"end":{"line":4,"column":50}}}) : helper)))
    + "\n        </p>\n        <ul class=\"pagination\">\n\n            <li class=\"page-item "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isFirstPage") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":9,"column":33},"end":{"line":9,"column":67}}})) != null ? stack1 : "")
    + "\">\n                    <a\n                    class=\"page-link\"\n                    href=\"#\"\n                    aria-label=\"Previous\"\n                    role=\"button\"\n                    "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isFirstPage") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":15,"column":20},"end":{"line":15,"column":80}}})) != null ? stack1 : "")
    + "\n                    "
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(depth0 != null ? lookupProperty(depth0,"isFirstPage") : depth0),{"name":"unless","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":16,"column":20},"end":{"line":16,"column":83}}})) != null ? stack1 : "")
    + ">\n                    <span aria-hidden=\"true\">&laquo;</span>\n                </a>\n            </li>\n\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"pageNumbers") : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":22,"column":12},"end":{"line":34,"column":21}}})) != null ? stack1 : "")
    + "\n            <li class=\"page-item "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isLastPage") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":37,"column":33},"end":{"line":37,"column":66}}})) != null ? stack1 : "")
    + "\">\n                    <a\n                    class=\"page-link\"\n                    href=\"#\"\n                    aria-label=\"Next\"\n                    role=\"button\"\n                    "
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"isLastPage") : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":43,"column":20},"end":{"line":43,"column":79}}})) != null ? stack1 : "")
    + "\n                    "
    + ((stack1 = lookupProperty(helpers,"unless").call(alias1,(depth0 != null ? lookupProperty(depth0,"isLastPage") : depth0),{"name":"unless","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":44,"column":20},"end":{"line":44,"column":82}}})) != null ? stack1 : "")
    + ">\n                    <span aria-hidden=\"true\">&raquo;</span>\n                </a>\n            </li>\n\n        </ul>\n    </div>\n</div>";
},"useData":true});
templates['search-results'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <div class=\"row mb-3\">\n            <div class=\"col-md-3\">\n                <img\n                    src=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"LocalPosterPath") || (depth0 != null ? lookupProperty(depth0,"LocalPosterPath") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"LocalPosterPath","hash":{},"data":data,"loc":{"start":{"line":6,"column":25},"end":{"line":6,"column":44}}}) : helper)))
    + "\"\n                    class=\"img-fluid w-100 p-1 border\"\n                    alt=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"LinkTitle") || (depth0 != null ? lookupProperty(depth0,"LinkTitle") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"LinkTitle","hash":{},"data":data,"loc":{"start":{"line":8,"column":25},"end":{"line":8,"column":38}}}) : helper)))
    + "\"\n                />\n            </div>\n            <div class=\"col-md-9\">\n                <div class=\"card\">\n                    <div class=\"card-header\">\n                        <h6>\n                            "
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"LinkTitle") || (depth0 != null ? lookupProperty(depth0,"LinkTitle") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"LinkTitle","hash":{},"data":data,"loc":{"start":{"line":15,"column":28},"end":{"line":15,"column":43}}}) : helper))) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"AverageScore") : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":15,"column":43},"end":{"line":18,"column":35}}})) != null ? stack1 : "")
    + "                        </h6>\n                    </div>\n                    <div class=\"card-body\">\n                        <table class=\"table table-sm card-table\">\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Genres") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":23,"column":28},"end":{"line":28,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Language") : depth0),{"name":"if","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":29,"column":28},"end":{"line":34,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Director") : depth0),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":35,"column":28},"end":{"line":40,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Cast") : depth0),{"name":"if","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":41,"column":28},"end":{"line":46,"column":35}}})) != null ? stack1 : "")
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Reviewers") : depth0),{"name":"if","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":47,"column":28},"end":{"line":52,"column":35}}})) != null ? stack1 : "")
    + "                        </table>\n"
    + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"Overview") : depth0),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":54,"column":24},"end":{"line":56,"column":31}}})) != null ? stack1 : "")
    + "                        <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"URLPath") || (depth0 != null ? lookupProperty(depth0,"URLPath") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"URLPath","hash":{},"data":data,"loc":{"start":{"line":57,"column":33},"end":{"line":57,"column":44}}}) : helper)))
    + "\" target=\"_blank\" rel=\"noopener\">\n                            Read all reviews of\n                            "
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"LinkTitle") || (depth0 != null ? lookupProperty(depth0,"LinkTitle") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"LinkTitle","hash":{},"data":data,"loc":{"start":{"line":59,"column":28},"end":{"line":59,"column":43}}}) : helper))) != null ? stack1 : "")
    + "\n                        </a>\n                    </div>\n                </div>\n            </div>\n        </div>\n        <hr />\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "\n                                <span class=\"small\">(FCG Rating\n                                    "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"AverageScore") || (depth0 != null ? lookupProperty(depth0,"AverageScore") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"AverageScore","hash":{},"data":data,"loc":{"start":{"line":17,"column":36},"end":{"line":17,"column":52}}}) : helper)))
    + ")</span>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <tr>\n                                    <th>Genres</th>\n                                    <td>"
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"Genres") || (depth0 != null ? lookupProperty(depth0,"Genres") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"Genres","hash":{},"data":data,"loc":{"start":{"line":26,"column":40},"end":{"line":26,"column":50}}}) : helper)))
    + "</td>\n                                </tr>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <tr>\n                                    <th>Language</th>\n                                    <td>"
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"Language") || (depth0 != null ? lookupProperty(depth0,"Language") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"Language","hash":{},"data":data,"loc":{"start":{"line":32,"column":40},"end":{"line":32,"column":54}}}) : helper))) != null ? stack1 : "")
    + "</td>\n                                </tr>\n";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <tr>\n                                    <th>Director</th>\n                                    <td>"
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"Director") || (depth0 != null ? lookupProperty(depth0,"Director") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"Director","hash":{},"data":data,"loc":{"start":{"line":38,"column":40},"end":{"line":38,"column":54}}}) : helper))) != null ? stack1 : "")
    + "</td>\n                                </tr>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <tr>\n                                    <th>Cast</th>\n                                    <td>"
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"Cast") || (depth0 != null ? lookupProperty(depth0,"Cast") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"Cast","hash":{},"data":data,"loc":{"start":{"line":44,"column":40},"end":{"line":44,"column":50}}}) : helper))) != null ? stack1 : "")
    + "</td>\n                                </tr>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                                <tr>\n                                    <th>Reviewers</th>\n                                    <td>"
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"Reviewers") || (depth0 != null ? lookupProperty(depth0,"Reviewers") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"Reviewers","hash":{},"data":data,"loc":{"start":{"line":50,"column":40},"end":{"line":50,"column":55}}}) : helper))) != null ? stack1 : "")
    + "</td>\n                                </tr>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1, helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                            <p class=\"mt-3\">"
    + ((stack1 = ((helper = (helper = lookupProperty(helpers,"Overview") || (depth0 != null ? lookupProperty(depth0,"Overview") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"Overview","hash":{},"data":data,"loc":{"start":{"line":55,"column":44},"end":{"line":55,"column":58}}}) : helper))) != null ? stack1 : "")
    + "</p>\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "<div>\n"
    + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"hits") : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":2,"column":4},"end":{"line":66,"column":13}}})) != null ? stack1 : "")
    + "</div>";
},"useData":true});
})();