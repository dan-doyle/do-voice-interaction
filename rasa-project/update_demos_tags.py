import fileinput

from utils_graphql import GraphQL

def write_demos_entities():

    try:
        file = None
        #we retrieve the list of available demos
        my_graphQL = GraphQL('./utilities/config.ini')
        available_demos = list(GraphQL.get_projects().values())
        #we open the nlu.md file in read mode to retrieve all the lines of the file
        file = open("./data/nlu.md","r")
        lines = file.readlines()
        #indexes where we will have to add the new known entities
        indexes = []
        #boolean to know if we are in the right intent
        in_right_intent = False

        for ind,line in enumerate(lines):
            #if there is an empty line we automatically store the index of this one without carrying out a test, in order to be able to add our demos.
            if in_right_intent and line=="\n":
                indexes.append(ind)
            elif in_right_intent:
                for item in available_demos:
                    if item in line:
                        #if the demo is already known by the file it means that there is no need to add it, so we remove it from our list.
                        available_demos.remove(item)
                    else:
                        indexes.append(ind)
            #we check this condition to detect the passage into the intended intent
            if 'intent:open' in line and not in_right_intent:
                in_right_intent = True
            #if we detect the name of the next intent then we are out of the open intent and we stop the loop
            if 'intent:out_of_scope' in line:
                break

        #we insert our new demos in new lines with stored indices
        for i,item in enumerate(available_demos):
            lines.insert(indexes[i],"- Open ["+item+"]"+"(demo)"+"\n")

        #we now open the file in write mode
        file = open("./data/nlu.md","w")
        #we update the file with the new lines
        file.writelines(lines)
        file.close()
    except Exception as e:
        print("Exception : ",str(e))
        if file!=None and not file.closed():
            file.close()

def write_tags_entities():

    try:
        file = None
        #we retrieve the list of available demos
        my_graphQL = GraphQL('./utilities/config.ini')
        tags = GraphQL.get_tags()
        #we open the nlu.md file in read mode to retrieve all the lines of the file
        file = open("./data/nlu.md","r")
        lines = file.readlines()
        #indexes where we will have to add the new known entities
        indexes = []
        #boolean to know if we are in the right intent
        in_right_intent = False

        for ind,line in enumerate(lines):
            #if there is an empty line we automatically store the index of this one without carrying out a test, in order to be able to add our demos.
            if in_right_intent and line=="\n":
                indexes.append(ind)
            elif in_right_intent:
                for item in tags:
                    if item in line:
                        #if the demo is already known by the file it means that there is no need to add it, so we remove it from our list.
                        tags.remove(item)
                    else:
                        indexes.append(ind)
            #we check this condition to detect the passage into the intended intent
            if 'intent:search' in line and not in_right_intent:
                in_right_intent = True
            #if we detect the name of the next intent then we are out of the open intent and we stop the loop
            if 'intent:shutdown' in line:
                break

        #we insert our new demos in new lines with stored indices
        for i,item in enumerate(tags):
            lines.insert(indexes[i],"- Look for ["+item+"]"+"(tag)"+"\n")

        #we now open the file in write mode
        file = open("./data/nlu.md","w")
        #we update the file with the new lines
        file.writelines(lines)
        file.close()
    except Exception as e:
        print("Exception : ",str(e))
        if file!=None and not file.closed():
            file.close()

write_demos_entities()
write_tags_entities()